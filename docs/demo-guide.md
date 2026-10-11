# Demo guide

A ten-minute walkthrough of Tempo Payment OS, in the order that shows the most. Start from a clean state: on the Dashboard, click **Reset demo data**.

## What is real and what is simulated

| Real (Tempo Moderato testnet) | Simulated (runs in your browser) |
|---|---|
| Network status: chain ID, latest block, latency | Payments created on the Payments page and by workflows. No funds move. |
| TIP-20 balance reads | "Simulate success", which only changes a local status |
| Wallet-signed TIP-20 transfers, with optional memos | The browser policy engine. It is a convenience layer, not a security boundary. |
| On-chain receipt verification and explorer links | Workflows. "Run now" is manual; nothing runs on a schedule. |
| The policy vault contract: limits, approvals and payments enforced on-chain | The activity log and saved data (browser local storage) |

Wallet transfers are both: they really happen on-chain, and they are also recorded in the payment history. Payments made through the vault are real but are shown only in the Vault panel.

## Part 1: the policy engine (simulated payments)

1. **Dashboard.** The sidebar badge shows "Tempo testnet / Connected" and the network panel shows a live block number. This is a real read from the public testnet RPC.
2. **Payments, approval.** Click **New payment** and create one for $1,500. The engine returns "Approval required" because it is over $1,000.
3. **Payments, block.** Try $6,000. It is blocked: the sample history already counts $2,500 toward the $5,000 daily limit, and Pending payments count too.
4. **Policies.** Switch on "New recipient review". A payment to a name not seen before now asks for approval.
5. **Automation.** Click **Run now** on "Weekly contractor payouts" a few times. Each run goes through the engine. After several runs the daily limit is reached and the run is blocked.
6. **Developers.** Change the amount in "Try the policy engine" and watch the decision update live.

## Part 2: real testnet reads and transfers

7. **Read a balance.** In "Read a TIP-20 balance", paste any address and click Read. This is a real on-chain read. For example, paste the vault address `0xa9e2dc607ded8a82eba3346aab9a3598162c3bc8` to see its pathUSD balance.
8. **Wallet transfer (needs MetaMask).**
   1. Add Tempo Moderato (chain ID 42431) to your wallet and get test pathUSD from https://tempo.xyz/faucet.
   2. In the Browser wallet panel, connect MetaMask.
   3. Enter a recipient address, an amount such as `0.01`, and an optional memo such as `INV-12345`. Memos are limited to 32 bytes.
   4. Click **Review & send**. The browser policy engine runs first, and a blocked transfer is never sent to the wallet.
   5. Confirm in MetaMask. The app waits for the on-chain receipt and shows "Transaction confirmed" with an explorer link. The transfer also appears on the Payments page.

## Part 3: the on-chain policy vault

The vault is a smart contract that enforces the rules itself. See [Policy vault](vault.md) for the design and its limits.

9. **Read it (no wallet needed).** Scroll to the **Policy vault (on-chain)** panel. It shows the vault balance, the daily limit, the amount left today, the approval threshold, and the recent payments, all read live from the chain. Click the vault link to open it in the explorer.
10. **Send through it (owner wallet only).** On the shared demo vault, only the owner wallet can submit payments and only the approver wallet can approve or reject them, so a visitor can read it but not spend from it. To try the full flow yourself, deploy your own vault (the steps are in [Policy vault](vault.md)) and connect as its owner. Then:
    - A payment under the approval threshold is sent immediately.
    - A payment above the threshold is held as **Pending** and moves no money until the approver clicks **Approve** (or **Reject**).
    - A payment that would break the daily limit is refused before your wallet even opens, with the reason shown.

On the demo vault these were verified on the testnet: an immediate payment with a memo, an immediate payment with no memo, a payment held for approval and then approved, and a payment held and then rejected.

## Persistence

11. **Reload the page.** Payments, activity, policy switches and workflow state are saved in the browser and survive a reload. The vault state always comes from the chain. Click **Reset demo data** on the Dashboard to start over. It does not affect your wallet or anything on-chain.

## Run it yourself

```bash
git clone https://github.com/Abbagigo13/tempo-payment-os.git
cd tempo-payment-os
npm install
npm run dev
npm test
```

See [Getting started](getting-started.md), [Policy engine](policy-engine.md), [Tempo integration](tempo-integration.md) and [Policy vault](vault.md) for details.
