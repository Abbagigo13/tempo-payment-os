# Policy engine

The policy engine is a pure function. Given a proposed payment, the current payment history, and the enabled policies, it returns a decision.

It lives in `src/lib/policyEngine.js`, and its tests are in `src/lib/policyEngine.test.js`.

This is the **browser** policy engine. For rules enforced on-chain, see the [policy vault](vault.md).

## The shape

```js
evaluatePayment(proposedPayment, payments, policies)
```

Returns:

```js
{
  result: "allowed" | "approval" | "blocked",
  reason: "human-readable string",
  evaluated: [
    { id, name, outcome: "pass" | "approval" | "blocked", detail }
  ]
}
```

## Where it is used

Every way of creating a payment in the app goes through the engine:

| Entry point | What happens |
| --- | --- |
| Payments page (New payment) | Evaluated on submit. Blocked payments are not created; others are added as Pending. |
| Automation page (Run now) | The workflow's payment template is evaluated like any other payment. |
| Dashboard wallet panel | Evaluated before anything is sent to the wallet. A blocked transfer is never signed. An "approval" result shows a warning in the confirm box. After sending, the transfer is added to the payment history as Completed (confirmed on-chain), Pending (submitted, not yet confirmed) or Failed (reverted). |
| Developers page | A sandbox that evaluates a hypothetical payment. Nothing is created. |
| Vault panel | Not used. The vault contract applies its own rules on-chain. |

Wallet transfers are recorded in the payment history, so they count toward the daily limit.

## Input validation

Before any policy runs, the amount is checked. If it is not a finite number greater than zero (for example `"abc"`, `0`, or `-5000`), the result is `blocked` with the reason "Amount must be a positive number." and `evaluated` is empty.

## Precedence

Blocked beats approval. Approval beats allowed.

1. If any enabled policy returns `blocked`, the overall result is `blocked`.
2. Otherwise, if any returns `approval`, the overall result is `approval`.
3. Otherwise, the result is `allowed`.

## Current policies

| ID | Name | Behavior |
| --- | --- | --- |
| 1 | Daily spending limit | Sum of Completed and Pending payments in the last 24 hours, plus the proposed amount. Over $5,000: blocked. |
| 2 | Large payment approval | Amount over $1,000: approval. |
| 3 | New recipient review | Recipient has no prior Completed payment: approval. Disabled by default. |

Policy definitions live in `src/data/demoData.js`.

### Details of the daily limit

- **Counted statuses:** `Completed` and `Pending`. Pending payments count so that many queued payments cannot slip past the limit before they complete. `Failed` payments are never counted. The list is `COUNTED_STATUSES` at the top of `policyEngine.js`.
- **Window:** the last 24 hours, measured from now.
- **Bad dates:** a payment with a missing or invalid date is counted anyway. For a spending limit it is safer to over-count than to skip.
- **Re-evaluation:** the payment being evaluated is excluded from the sum, so it is never counted twice.

### Details of the new recipient policy

Recipient names are compared after trimming whitespace and lowercasing. An empty or missing recipient is never treated as known.

### Policy IDs

IDs are converted with `Number()`, so `"1"` and `1` behave the same.

## Adding a new policy

1. Add the definition to `initialPolicies` in `src/data/demoData.js`:

```js
{
  id: 4,
  name: "Payment purpose required",
  description: "Require a non-empty memo on all payments.",
  enabled: true,
  type: "Compliance",
}
```

1. Add a `case 4:` in the `runPolicy` switch in `src/lib/policyEngine.js`:

```js
function runPolicy(policy, context) {
  switch (Number(policy.id)) {
    case 1: return dailySpendingLimit(context);
    case 2: return largePaymentApproval(context);
    case 3: return newRecipientReview(context);
    case 4: return memoRequired(context);
    default: return { outcome: "pass", detail: "No check defined." };
  }
}
```

1. Write the check function:

```js
function memoRequired({ proposedPayment }) {
  if (!proposedPayment.memo || !proposedPayment.memo.trim()) {
    return {
      outcome: "blocked",
      detail: "Payment memo is required.",
    };
  }
  return { outcome: "pass", detail: "Memo present." };
}
```

1. Add a test in `src/lib/policyEngine.test.js`.

That's the whole extension pattern. Policies are just functions that return one of three outcomes.

## Security boundary

These checks run in the browser. They are convenience controls, not a security boundary. A user who can bypass the app can bypass them.

For rules that must hold, use the on-chain [policy vault](vault.md). It enforces a daily limit and an approval threshold inside a smart contract, so money held in the vault cannot leave except through a payment that passes them, whatever app or script sends the transaction. The vault is a separate system: payments made through it are not evaluated by this engine and do not appear in this app's payment history.

The vault is a testnet demo and has not been audited. Its owner can change the rules instantly, so it does not protect against a stolen owner key. Production deployments should add a delay on loosening changes, separate owner and approver wallets, and an audit.
