const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
  time,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// Amounts are in the token's smallest units. pathUSD has 6 decimals.
const usd = (n) => BigInt(n) * 10n ** 6n;
const memo = (text) => ethers.encodeBytes32String(text);
const NO_MEMO = ethers.ZeroHash;

// Payment status values from the contract
const PENDING = 1n;
const EXECUTED = 2n;
const REJECTED = 3n;

async function deployFixture() {
  const [owner, approver, alice, bob] = await ethers.getSigners();

  // Start at 1 a.m. UTC on a fresh day so no test straddles midnight.
  const now = await time.latest();
  const nextDay = (Math.floor(now / 86400) + 1) * 86400;
  await time.increaseTo(nextDay + 3600);

  const token = await (await ethers.getContractFactory("MockTIP20")).deploy();
  await token.waitForDeployment();

  const vault = await (
    await ethers.getContractFactory("PolicyVault")
  ).deploy(
    token.target,
    owner.address,
    approver.address,
    usd(5000), // daily limit
    usd(1000) // approval threshold
  );
  await vault.waitForDeployment();

  await token.mint(vault.target, usd(100000));

  return { vault, token, owner, approver, alice, bob };
}

describe("PolicyVault", function () {
  it("sets its parameters from the constructor", async function () {
    const { vault, token, owner, approver } = await loadFixture(deployFixture);
    expect(await vault.token()).to.equal(token.target);
    expect(await vault.owner()).to.equal(owner.address);
    expect(await vault.approver()).to.equal(approver.address);
    expect(await vault.dailyLimit()).to.equal(usd(5000));
    expect(await vault.approvalThreshold()).to.equal(usd(1000));
    expect(await vault.requireKnownRecipient()).to.equal(false);
  });

  it("executes a small payment immediately", async function () {
    const { vault, token, alice } = await loadFixture(deployFixture);
    await expect(vault.submitPayment(alice.address, usd(100), NO_MEMO))
      .to.emit(vault, "PaymentExecuted")
      .withArgs(1, alice.address, usd(100), NO_MEMO);
    expect(await token.balanceOf(alice.address)).to.equal(usd(100));
    const p = await vault.getPayment(1);
    expect(p.status).to.equal(EXECUTED);
  });

  it("forwards the memo to the token", async function () {
    const { vault, token, alice } = await loadFixture(deployFixture);
    await expect(vault.submitPayment(alice.address, usd(100), memo("INV-1")))
      .to.emit(token, "TransferWithMemo")
      .withArgs(vault.target, alice.address, usd(100), memo("INV-1"));
  });

  it("holds a payment above the threshold and moves no money", async function () {
    const { vault, token, alice } = await loadFixture(deployFixture);
    await expect(vault.submitPayment(alice.address, usd(1500), NO_MEMO))
      .to.emit(vault, "PaymentPending")
      .withArgs(1, alice.address, usd(1500), NO_MEMO);
    expect(await token.balanceOf(alice.address)).to.equal(0n);
    const p = await vault.getPayment(1);
    expect(p.status).to.equal(PENDING);
    // Pending payments do not count toward the daily limit.
    expect(await vault.remainingToday()).to.equal(usd(5000));
  });

  it("lets the approver approve a pending payment", async function () {
    const { vault, token, approver, alice } = await loadFixture(deployFixture);
    await vault.submitPayment(alice.address, usd(1500), NO_MEMO);
    await expect(vault.connect(approver).approve(1))
      .to.emit(vault, "PaymentExecuted")
      .withArgs(1, alice.address, usd(1500), NO_MEMO);
    expect(await token.balanceOf(alice.address)).to.equal(usd(1500));
    const p = await vault.getPayment(1);
    expect(p.status).to.equal(EXECUTED);
  });

  it("lets the approver reject a pending payment", async function () {
    const { vault, token, approver, alice } = await loadFixture(deployFixture);
    await vault.submitPayment(alice.address, usd(1500), NO_MEMO);
    await expect(vault.connect(approver).reject(1))
      .to.emit(vault, "PaymentRejected")
      .withArgs(1);
    expect(await token.balanceOf(alice.address)).to.equal(0n);
    const p = await vault.getPayment(1);
    expect(p.status).to.equal(REJECTED);
  });

  it("only the approver can approve or reject", async function () {
    const { vault, alice } = await loadFixture(deployFixture);
    await vault.submitPayment(alice.address, usd(1500), NO_MEMO);
    await expect(vault.approve(1)).to.be.revertedWithCustomError(
      vault,
      "NotApprover"
    );
    await expect(vault.connect(alice).reject(1)).to.be.revertedWithCustomError(
      vault,
      "NotApprover"
    );
  });

  it("only the owner can submit payments", async function () {
    const { vault, alice } = await loadFixture(deployFixture);
    await expect(
      vault.connect(alice).submitPayment(alice.address, usd(100), NO_MEMO)
    ).to.be.revertedWithCustomError(vault, "NotOwner");
  });

  it("blocks a payment that breaks the daily limit and records nothing", async function () {
    const { vault, token, alice } = await loadFixture(deployFixture);
    for (let i = 0; i < 5; i++) {
      await vault.submitPayment(alice.address, usd(1000), NO_MEMO);
    }
    // Exactly at the limit is allowed. One more unit is not.
    await expect(vault.submitPayment(alice.address, usd(1), NO_MEMO))
      .to.be.revertedWithCustomError(vault, "DailyLimitExceeded")
      .withArgs(usd(5001), usd(5000));
    expect(await vault.paymentCount()).to.equal(5n);
    expect(await token.balanceOf(alice.address)).to.equal(usd(5000));
    expect(await vault.remainingToday()).to.equal(0n);
  });

  it("resets the daily limit the next day", async function () {
    const { vault, alice } = await loadFixture(deployFixture);
    for (let i = 0; i < 5; i++) {
      await vault.submitPayment(alice.address, usd(1000), NO_MEMO);
    }
    await time.increase(86400);
    await expect(
      vault.submitPayment(alice.address, usd(1000), NO_MEMO)
    ).to.emit(vault, "PaymentExecuted");
  });

  it("rechecks the daily limit when a pending payment is approved", async function () {
    const { vault, approver, alice } = await loadFixture(deployFixture);
    await vault.submitPayment(alice.address, usd(1500), NO_MEMO); // pending
    for (let i = 0; i < 4; i++) {
      await vault.submitPayment(alice.address, usd(1000), NO_MEMO);
    }
    // 4000 already spent + 1500 would be 5500 > 5000
    await expect(vault.connect(approver).approve(1))
      .to.be.revertedWithCustomError(vault, "DailyLimitExceeded")
      .withArgs(usd(5500), usd(5000));
    const stillPending = await vault.getPayment(1);
    expect(stillPending.status).to.equal(PENDING);

    // The next day there is room again.
    await time.increase(86400);
    await vault.connect(approver).approve(1);
    const done = await vault.getPayment(1);
    expect(done.status).to.equal(EXECUTED);
  });

  it("cannot approve or reject the same payment twice", async function () {
    const { vault, approver, alice } = await loadFixture(deployFixture);
    await vault.submitPayment(alice.address, usd(1500), NO_MEMO);
    await vault.connect(approver).approve(1);
    await expect(vault.connect(approver).approve(1))
      .to.be.revertedWithCustomError(vault, "NotPending")
      .withArgs(1);
    await expect(vault.connect(approver).reject(1))
      .to.be.revertedWithCustomError(vault, "NotPending")
      .withArgs(1);
  });

  it("sends payments to unknown recipients for approval when required", async function () {
    const { vault, approver, alice } = await loadFixture(deployFixture);
    await vault.setRequireKnownRecipient(true);
    await expect(vault.submitPayment(alice.address, usd(100), NO_MEMO)).to.emit(
      vault,
      "PaymentPending"
    );
    // Once approved, alice is a known recipient.
    await vault.connect(approver).approve(1);
    await expect(vault.submitPayment(alice.address, usd(100), NO_MEMO)).to.emit(
      vault,
      "PaymentExecuted"
    );
  });

  it("treats anyone already paid as a known recipient", async function () {
    const { vault, alice } = await loadFixture(deployFixture);
    await vault.submitPayment(alice.address, usd(100), NO_MEMO); // executes
    await vault.setRequireKnownRecipient(true);
    await expect(vault.submitPayment(alice.address, usd(100), NO_MEMO)).to.emit(
      vault,
      "PaymentExecuted"
    );
  });

  it("lets the owner add a known recipient by hand", async function () {
    const { vault, bob } = await loadFixture(deployFixture);
    await vault.setRequireKnownRecipient(true);
    await expect(vault.addKnownRecipient(bob.address))
      .to.emit(vault, "KnownRecipientAdded")
      .withArgs(bob.address);
    await expect(vault.submitPayment(bob.address, usd(100), NO_MEMO)).to.emit(
      vault,
      "PaymentExecuted"
    );
  });

  it("rejects a zero amount and a zero address", async function () {
    const { vault, alice } = await loadFixture(deployFixture);
    await expect(
      vault.submitPayment(alice.address, 0, NO_MEMO)
    ).to.be.revertedWithCustomError(vault, "ZeroAmount");
    await expect(
      vault.submitPayment(ethers.ZeroAddress, usd(100), NO_MEMO)
    ).to.be.revertedWithCustomError(vault, "ZeroAddress");
  });

  it("only the owner can change policies, and changes emit events", async function () {
    const { vault, alice } = await loadFixture(deployFixture);
    await expect(
      vault.connect(alice).setDailyLimit(usd(1))
    ).to.be.revertedWithCustomError(vault, "NotOwner");
    await expect(vault.setDailyLimit(usd(9000)))
      .to.emit(vault, "DailyLimitChanged")
      .withArgs(usd(5000), usd(9000));
    expect(await vault.dailyLimit()).to.equal(usd(9000));
  });

  it("reports the amount remaining today", async function () {
    const { vault, alice } = await loadFixture(deployFixture);
    await vault.submitPayment(alice.address, usd(1000), NO_MEMO);
    expect(await vault.remainingToday()).to.equal(usd(4000));
  });

  it("reverts when the vault does not hold enough tokens", async function () {
    const { vault, alice } = await loadFixture(deployFixture);
    await vault.setDailyLimit(usd(1000000));
    await vault.setApprovalThreshold(usd(1000000));
    await expect(
      vault.submitPayment(alice.address, usd(200000), NO_MEMO)
    ).to.be.revertedWith("insufficient balance");
  });
});
