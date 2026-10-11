# Policy vault

The policy vault is a smart contract that enforces payment rules **on-chain**. The browser policy engine is a convenience layer that anyone can bypass by skipping the app. The vault is different: money held in it can only leave through a payment that passes its rules, whatever app or script sends the transaction.

**Status: testnet demo. Not audited. Do not use it with real funds.**

## Deployment

| | |
| --- | --- |
| Network | Tempo Moderato testnet (chain ID 42431) |
| Vault | `0xa9e2dc607ded8a82eba3346aab9a3598162c3bc8` |
| Token | pathUSD, `0x20c0000000000000000000000000000000000000` (6 decimals) |
| Owner and approver | `0x6170873349c100A2C23f9C51383a6aA7b16Aa17C` (one wallet plays both roles in the demo) |
| Daily limit | 5,000 pathUSD |
| Approval threshold | 1,000 pathUSD |
| Deployment transaction | `0xfa04b8aa86cb847e6f6f0fdb2d11b358cb1ca24640c574f329f3bbef95c4eaf8` |

Source: `contracts/src/PolicyVault.sol`. The deployment record is `contracts/deployments/moderato.json`.

## How it works

One vault holds **one token**, chosen at deployment. It has two roles:

- The **owner** submits payments and changes the settings.
- The **approver** approves or rejects payments that are held.

The rules:

| Rule | Behavior |
| --- | --- |
| Daily limit | The total executed in a UTC day cannot exceed the limit. A payment that would break it is refused and nothing is recorded. |
| Approval threshold | A payment above the threshold is stored as **Pending**. No money moves until the approver approves it. |
| Known recipients (off by default) | When switched on, a recipient the vault has never paid is held for approval. Anyone the vault has paid, or the owner adds by hand, is known. |

The life of a payment:

1. The owner calls `submitPayment(to, amount, memo)`.
2. If the payment is within the rules, it executes immediately through the token's `transferWithMemo`.
3. If it needs approval, it waits as Pending.
4. The approver calls `approve(id)` or `reject(id)`. Approving **checks the daily limit again at that moment**, so a payment cannot be queued now and approved past the limit later.

There is no withdraw function. Funds leave the vault only through payments that pass the rules. You fund the vault by sending the token to its address, for example with the Wallet panel.

### Functions

| Function | Who | What it does |
| --- | --- | --- |
| `submitPayment(to, amount, memo)` | Owner | Execute or hold a payment |
| `approve(id)`, `reject(id)` | Approver | Decide a pending payment |
| `setDailyLimit`, `setApprovalThreshold` | Owner | Change the limits (effective immediately) |
| `setRequireKnownRecipient`, `addKnownRecipient` | Owner | Manage the recipient rule |
| `setApprover`, `setOwner` | Owner | Change the roles |
| `remainingToday`, `getPayment`, `paymentCount` | Anyone | Read state |

Amounts are in the token's smallest unit (pathUSD has 6 decimals, so 5,000 is `5000000000`). Memos are 32 bytes, the same format the Wallet panel produces. A payment with no memo sends an all-zero memo, which the real token accepts.

## Differences from the browser policy engine

| | Browser engine | Vault |
| --- | --- | --- |
| Where it runs | The browser | On-chain |
| Can be bypassed | Yes | No, for money held in the vault |
| Daily window | Rolling 24 hours | Fixed UTC days |
| Pending payments | Count toward the limit | Do not count, because nothing moves until execution, when the limit is checked |
| Payment list | The Payments page | The Vault panel only |

Payments made through the vault are **not** recorded on the Payments page and do not count toward its browser-side limit. They exist on-chain and in the Vault panel.

## Using it from the app

The Dashboard has a **Policy vault (on-chain)** panel:

- It shows the vault balance, the daily limit, the amount left today, the approval threshold, and the 10 most recent payments. You can read it without a wallet.
- Connect the owner wallet to send a payment through the vault. A hint tells you whether it will be sent, held, or refused.
- Connect the approver wallet to see Approve and Reject buttons on pending payments. The buttons are a convenience; the contract itself enforces the roles.
- Before your wallet opens, the app asks the network to estimate the transaction. If the vault would refuse it, you see the reason first.

The panel reads state through the network's Multicall3 contract in two requests, because the public RPC is rate limited and rejects JSON-RPC batches. Gas is estimated for every transaction, because creating contract storage costs far more gas on Tempo than a plain transfer.

## Working on the contract

All commands run in the `contracts` folder.

```powershell
npm install
npx hardhat compile
npx hardhat test
```

To deploy your own copy:

```powershell
node scripts/setup-wallet.mjs <your wallet address>   # creates .env with a throwaway deployer key
node scripts/deploy.mjs                                # dry run: shows the plan and sends nothing
node scripts/deploy.mjs --send                         # deploys for real
node scripts/export-abi.mjs                            # updates the ABI and address used by the app
node scripts/vault-status.mjs                          # reads the vault's state from the chain
```

The deployer key is generated locally and saved in `contracts/.env`, which Git ignores. Fund that address from the Tempo faucet, never reuse the key anywhere else, and never commit it.

## What has been tested

**Unit tests:** 19 tests run in Hardhat against a fake token, covering the daily limit, holding and approving, rechecking at approval time, the recipient rules, roles, validation and an underfunded vault.

**On the Tempo testnet:**

- A payment under the threshold with a memo executed.
- A payment with no memo executed.
- A payment of 1,001 was held as Pending, moved no money, then executed after approval.
- A payment of 1,001 was held, then rejected, and moved no money.
- The daily total was counted on-chain and the panel matched the chain.

**Not yet tested live:** the daily limit refusal, the known-recipient rule, the policy setters, and role changes. Only the unit tests cover them.

## Limitations

- **The owner can change policies instantly.** A stolen owner key could raise the limit and drain the vault. The vault protects against mistakes and buggy apps, not a compromised owner. A delay on loosening changes would fix this.
- **One wallet is both owner and approver** in the demo, so it approves its own payments. Use two wallets for a real separation of duties.
- **Fixed UTC days:** a burst just before and just after midnight UTC can move up to twice the daily limit in a short span.
- **One token per vault**, and funds can only leave through payments, so a lost owner key locks the funds.
- **Not audited.** Testnet only.
