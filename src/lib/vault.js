// src/lib/vault.js
//
// Talks to the PolicyVault contract: reads its state, and sends
// submit / approve / reject transactions signed by the user's wallet.

import {
  createWalletClient,
  custom,
  formatUnits,
  hexToString,
  isAddress,
  zeroHash,
} from "viem";
import { tempoTestnet, publicClient } from "./tempo.js";
import { TIP20_ABI } from "./tip20Abi.js";
import { parseTokenAmount } from "./tip20.js";
import { encodeMemo, getChainIdFromProvider } from "./wallet.js";
import { VAULT_ABI } from "./vaultAbi.js";
import { VAULT_ADDRESS, VAULT_TOKEN } from "./vaultConfig.js";

const MAX_TX_GAS = 30_000_000n; // Tempo's per-transaction cap
const RECEIPT_TIMEOUT_MS = 60_000;
const RECENT_PAYMENTS = 10;

// Multicall3 is predeployed on Tempo at the standard address.
const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11";

export const PAYMENT_STATUS = ["None", "Pending", "Executed", "Rejected"];

const vaultCall = (functionName, args = []) => ({
  address: VAULT_ADDRESS,
  abi: VAULT_ABI,
  functionName,
  args,
});

const tokenCall = (functionName, args = []) => ({
  address: VAULT_TOKEN,
  abi: TIP20_ABI,
  functionName,
  args,
});

// Many reads in ONE call. The public RPC is rate limited and rejects
// JSON-RPC batches, so this goes through Multicall3 instead.
// batchSize 0 keeps everything in a single request.
const readMany = (contracts) =>
  publicClient.multicall({
    contracts,
    multicallAddress: MULTICALL3,
    allowFailure: false,
    batchSize: 0,
  });

function decodeMemo(memoHex) {
  if (!memoHex || memoHex === zeroHash) return "";
  try {
    return hexToString(memoHex, { size: 32 }).split("\0").join("").trim();
  } catch {
    return memoHex;
  }
}

/**
 * Read the vault's current state and its most recent payments.
 * Two RPC requests in total.
 */
export async function readVaultState() {
  const [
    owner,
    approver,
    dailyLimit,
    approvalThreshold,
    remainingToday,
    requireKnownRecipient,
    paymentCount,
    decimals,
    symbol,
    balance,
  ] = await readMany([
    vaultCall("owner"),
    vaultCall("approver"),
    vaultCall("dailyLimit"),
    vaultCall("approvalThreshold"),
    vaultCall("remainingToday"),
    vaultCall("requireKnownRecipient"),
    vaultCall("paymentCount"),
    tokenCall("decimals"),
    tokenCall("symbol"),
    tokenCall("balanceOf", [VAULT_ADDRESS]),
  ]);

  const fmt = (raw) => formatUnits(raw, decimals);

  const count = Number(paymentCount);
  const firstId = Math.max(1, count - RECENT_PAYMENTS + 1);
  const ids = [];
  for (let id = count; id >= firstId; id--) ids.push(id);

  const rows = ids.length
    ? await readMany(ids.map((id) => vaultCall("getPayment", [BigInt(id)])))
    : [];

  const payments = rows.map((p, i) => ({
    id: ids[i],
    to: p.to,
    amount: p.amount,
    amountFormatted: fmt(p.amount),
    memo: p.memo,
    memoText: decodeMemo(p.memo),
    createdAt: Number(p.createdAt),
    status: PAYMENT_STATUS[Number(p.status)] || "Unknown",
  }));

  return {
    address: VAULT_ADDRESS,
    owner,
    approver,
    symbol,
    decimals,
    requireKnownRecipient,
    paymentCount: count,
    balance,
    balanceFormatted: fmt(balance),
    dailyLimit,
    dailyLimitFormatted: fmt(dailyLimit),
    approvalThreshold,
    approvalThresholdFormatted: fmt(approvalThreshold),
    remainingToday,
    remainingTodayFormatted: fmt(remainingToday),
    payments,
  };
}

function describeError(error, decimals = 6) {
  const reverted = error?.walk?.(
    (e) => e?.name === "ContractFunctionRevertedError"
  );
  const name = reverted?.data?.errorName;
  const args = reverted?.data?.args ?? [];

  switch (name) {
    case "NotOwner":
      return "Only the vault owner can submit payments.";
    case "NotApprover":
      return "Only the vault approver can approve or reject payments.";
    case "ZeroAmount":
      return "Amount must be greater than zero.";
    case "ZeroAddress":
      return "The address cannot be the zero address.";
    case "NotPending":
      return `Payment #${args[0]} is not pending.`;
    case "DailyLimitExceeded":
      return `Blocked by the vault: this would bring today's total to ${formatUnits(
        args[0],
        decimals
      )} of a ${formatUnits(args[1], decimals)} daily limit.`;
    default:
      break;
  }

  return (
    reverted?.reason ||
    error?.shortMessage ||
    error?.message ||
    "Transaction failed."
  );
}

/**
 * Send a vault transaction using the given wallet provider.
 *
 * Returns the same shapes as sendTip20Transfer:
 *   { ok: true, hash, confirmed: true | false }
 *   { ok: false, error, hash? }
 */
async function sendVaultTransaction({
  provider,
  from,
  functionName,
  args,
  decimals = 6,
}) {
  if (!provider) return { ok: false, error: "No wallet provider." };
  if (!isAddress(from)) return { ok: false, error: "Sender address is invalid." };

  let chainId;
  try {
    chainId = await getChainIdFromProvider(provider);
  } catch {
    return { ok: false, error: "Could not read the wallet's network." };
  }
  if (chainId !== tempoTestnet.id) {
    return {
      ok: false,
      error: `Wallet is on the wrong network. Switch to ${tempoTestnet.name} (chain ID ${tempoTestnet.id}).`,
    };
  }

  // Estimate gas through the RPC. If the vault would refuse the call
  // (daily limit, wrong role...), this fails with a readable reason
  // before the wallet is ever opened.
  let gas;
  try {
    const estimate = await publicClient.estimateContractGas({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName,
      args,
      account: from,
    });
    gas = (estimate * 130n) / 100n; // 30% safety margin
  } catch (error) {
    return { ok: false, error: describeError(error, decimals) };
  }
  if (gas > MAX_TX_GAS) {
    return { ok: false, error: "Estimated gas is over the network limit." };
  }

  let hash;
  try {
    const walletClient = createWalletClient({
      chain: tempoTestnet,
      transport: custom(provider),
    });
    hash = await walletClient.writeContract({
      account: from,
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName,
      args,
      gas,
    });
  } catch (error) {
    return {
      ok: false,
      error: error?.shortMessage || error?.message || "Transaction rejected.",
    };
  }

  let receipt;
  try {
    receipt = await publicClient.waitForTransactionReceipt({
      hash,
      timeout: RECEIPT_TIMEOUT_MS,
    });
  } catch {
    return { ok: true, hash, confirmed: false };
  }

  if (receipt.status !== "success") {
    return {
      ok: false,
      hash,
      error: "Transaction was submitted but reverted on-chain.",
    };
  }
  return { ok: true, hash, confirmed: true };
}

/** Submit a payment through the vault (owner only). `amount` is a decimal string. */
export async function submitVaultPayment({
  provider,
  from,
  to,
  amount,
  memo,
  decimals = 6,
}) {
  if (!isAddress(to)) return { ok: false, error: "Recipient address is invalid." };

  const encoded = encodeMemo(memo);
  if (!encoded.ok) return { ok: false, error: encoded.error };

  let raw;
  try {
    raw = parseTokenAmount(amount, decimals);
  } catch (error) {
    return { ok: false, error: error.message };
  }
  if (raw <= 0n) return { ok: false, error: "Amount must be greater than zero." };

  return sendVaultTransaction({
    provider,
    from,
    functionName: "submitPayment",
    args: [to, raw, encoded.hex ?? zeroHash],
    decimals,
  });
}

/** Approve a pending payment (approver only). */
export function approveVaultPayment({ provider, from, id, decimals = 6 }) {
  return sendVaultTransaction({
    provider,
    from,
    functionName: "approve",
    args: [BigInt(id)],
    decimals,
  });
}

/** Reject a pending payment (approver only). */
export function rejectVaultPayment({ provider, from, id, decimals = 6 }) {
  return sendVaultTransaction({
    provider,
    from,
    functionName: "reject",
    args: [BigInt(id)],
    decimals,
  });
}
