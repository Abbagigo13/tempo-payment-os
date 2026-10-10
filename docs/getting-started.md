# Getting started

From a clean clone to a running app in three commands.

## Requirements

- Node.js 18 or later
- npm
- A modern browser (Chrome, Edge, Firefox, Safari)
- Optional: a browser wallet (MetaMask verified) for testnet writes

## Run it

```bash
git clone https://github.com/Abbagigo13/tempo-payment-os.git
cd tempo-payment-os
npm install
npm run dev
```

Open the URL that Vite prints (usually <http://localhost:5173>).

That's it. No environment variables, no database, no API keys.

## Run the tests

```bash
npm test
```

19 tests, all green, covering the policy engine.

## What works out of the box

- **Dashboard**: payment overview with a live Tempo network panel
- **Payments**: create, block, or route payments through the policy engine; simulate execution
- **Policies**: toggle policy rules; changes affect the payment modal live
- **Automation**: pause or activate workflows; "Run now" creates a payment
- **Developers**: live code examples and a policy-engine sandbox

## What requires a wallet

The Browser wallet panel on the Dashboard connects to MetaMask (verified) or any EIP-6963 wallet. A testnet transfer requires:

1. Connecting a wallet
2. Being on the Tempo Moderato testnet (chain ID 42431)
3. Having pathUSD on that address

Get testnet funds at the Tempo faucet: <https://tempo.xyz/faucet>

## Troubleshooting

- **`npm install` hangs**: press Ctrl+C, run `npm cache clean --force`, then retry.
- **Blank page**: check the browser console for import errors; usually a missing file.
- **Wallet connect fails**: install MetaMask if you don't have a wallet, and check that no extension is blocking `window.ethereum`.
- **Transfer fails with "insufficient balance"**: you're trying to send more than you have, or the token dropdown is on a different token than the one you hold.

### File 2b — `docs/policy-engine.md`

Right-click `docs` → **New File** → name it `policy-engine.md`. Paste:

```markdown
# Policy engine

The policy engine is a pure function. Given a proposed payment, the current payment history, and the enabled policies, it returns a decision.

## The shape

```js
evaluatePayment(proposedPayment, payments, policies)
Returns:
{
  result: "allowed" | "approval" | "blocked",
  reason: "human-readable string",
  evaluated: [
    { id, name, outcome: "pass" | "approval" | "blocked", detail }
  ]
}
Precedence
Blocked beats approval. Approval beats allowed.

If any enabled policy returns blocked, the overall result is blocked.
Otherwise, if any returns approval, the overall result is approval.
Otherwise, allowed.

Current policies
ID Name Behavior
1 Daily spending limit Sum of Completed payments in the last 24h + the proposed amount. Over $5,000 → blocked.
2 Large payment approval Amount > $1,000 → approval.
3 New recipient review Recipient has no prior Completed payment → approval. Disabled by default.
Policy definitions live in src/data/demoData.js.
Adding a new policy
1.Add the definition to initialPolicies in src/data/demoData.js:

{
  id: 4,
  name: "Payment purpose required",
  description: "Require a non-empty memo on all payments.",
  enabled: true,
  type: "Compliance",
}

2.Add a case 4: in the runPolicy switch in src/lib/policyEngine.js:

function runPolicy(policy, context) {
  switch (policy.id) {
    case 1: return dailySpendingLimit(context);
    case 2: return largePaymentApproval(context);
    case 3: return newRecipientReview(context);
    case 4: return memoRequired(context);
    default: return { outcome: "pass", detail: "No check defined." };
  }
}

3.Write the check function:

function memoRequired({ proposedPayment }) {
  if (!proposedPayment.memo || !proposedPayment.memo.trim()) {
    return {
      outcome: "blocked",
      detail: "Payment memo is required.",
    };
  }
  return { outcome: "pass", detail: "Memo present." };
}

4.Add a test in src/lib/policyEngine.test.js.

That's the whole extension pattern. Policies are just functions that return one of three outcomes.

Security boundary
These checks run in the browser. They are convenience controls, not a security boundary. A user who can bypass the app can bypass them. Production deployments must enforce critical rules at a trusted execution layer — smart-account permissions, on-chain contracts, or token-level policies.

### File 2c — `docs/tempo-integration.md`

Right-click `docs` → **New File** → name it `tempo-integration.md`. Paste:

```markdown
# Tempo integration

This app talks to the Tempo Moderato testnet — both reading chain state and submitting signed transactions. No private keys are stored in the app; every write is signed by a browser wallet extension.

## Network

| Field | Value |
|---|---|
| Chain ID | `42431` (`0xa5bf`) |
| RPC | `https://rpc.moderato.tempo.xyz` |
| Explorer | `https://explore.testnet.tempo.xyz` |
| Currency symbol | `USD` |

Defined in `src/lib/tempo.js` as `tempoTestnet`.

## Reading

```js
import { publicClient } from "../src/lib/tempo";
import { TIP20_ABI } from "../src/lib/tip20Abi";

const raw = await publicClient.readContract({
  address: "0x20c0000000000000000000000000000000000000", // pathUSD
  abi: TIP20_ABI,
  functionName: "balanceOf",
  args: ["0x0000000000000000000000000000000000000001"],
});

See examples/read-balance.mjs for a runnable version.

Writing
The write path is:

1.User connects a wallet via EIP-6963 (src/hooks/useWallet.js)

2.User picks a token, recipient, and amount in the Wallet panel

3.The app calls sendTip20Transfer (src/lib/wallet.js)

4.The wallet extension signs and submits

5.The hash is returned and displayed with an explorer link

Important notes
Gas must be explicit. Tempo uses stablecoins for fees, but wallet extensions cannot price Tempo gas natively. MetaMask overshoots the gas limit by ~580x, which exceeds Tempo's 30M per-transaction cap. The transfer call passes gas: 300000n explicitly to bypass the wallet's estimator.

await walletClient.writeContract({
  account,
  address: tokenAddress,
  abi: TIP20_ABI,
  functionName: "transfer",
  args: [to, rawAmount],
  gas: 300000n, // required
});

Decimals must be read from the contract. pathUSD uses 6 decimals, not 18. Never hardcode this. getTokenDecimals() in src/lib/tip20.js reads and caches the value.

Wallet support is limited. Verified with MetaMask. OKX Wallet cannot sign Tempo transactions — the fee estimator fails and the Confirm button stays disabled. Any EIP-6963 wallet is worth trying, but MetaMask is the known-working path today.

Faucet
Testnet pathUSD is available at https://tempo.xyz/faucet. Request funds to your connected wallet address, wait ~10 seconds, then verify in the app's Network panel.

Known limitations
1.No wallet connect restore across reloads — you reconnect each session

2.Wallets may mis-display TIP-20 amounts in their signing dialog; always verify in the app's confirmation box first

3.No memo support yet on transfers (Tempo supports memos natively — this is a planned addition)
