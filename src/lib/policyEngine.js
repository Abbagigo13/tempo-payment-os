// src/lib/policyEngine.js
//
// Local policy evaluator for Tempo Payment OS.
//
// IMPORTANT: These checks run in the browser only. They are UI-level
// convenience controls, not a security boundary. See README §5.3.

const DAY_MS = 24 * 60 * 60 * 1000;

function sumRecentCompleted(payments, excludeId) {
  const now = Date.now();
  return payments
    .filter((p) => p.id !== excludeId)
    .filter((p) => p.status === "Completed")
    .filter((p) => now - new Date(p.date).getTime() < DAY_MS)
    .reduce((total, p) => total + Number(p.amount || 0), 0);
}

function isKnownRecipient(payments, recipient) {
  const target = recipient.trim().toLowerCase();
  return payments.some(
    (p) =>
      p.status === "Completed" &&
      p.recipient.trim().toLowerCase() === target
  );
}

/**
 * Evaluate a proposed payment against enabled policies.
 *
 * @returns {{
 *   result: 'allowed' | 'approval' | 'blocked',
 *   reason: string,
 *   evaluated: { id, name, outcome, detail }[]
 * }}
 */
export function evaluatePayment(proposedPayment, payments, policies) {
  const amount = Number(proposedPayment.amount || 0);
  const evaluated = [];

  let blocked = null;
  let needsApproval = null;

  for (const policy of policies.filter((p) => p.enabled)) {
    const check = runPolicy(policy, { proposedPayment, payments, amount });

    evaluated.push({
      id: policy.id,
      name: policy.name,
      outcome: check.outcome,
      detail: check.detail,
    });

    if (check.outcome === "blocked" && !blocked) blocked = check;
    if (check.outcome === "approval" && !needsApproval) needsApproval = check;
  }

  if (blocked) {
    return { result: "blocked", reason: blocked.detail, evaluated };
  }
  if (needsApproval) {
    return { result: "approval", reason: needsApproval.detail, evaluated };
  }
  return { result: "allowed", reason: "All policies passed.", evaluated };
}

function runPolicy(policy, context) {
  switch (policy.id) {
    case 1:
      return dailySpendingLimit(context);
    case 2:
      return largePaymentApproval(context);
    case 3:
      return newRecipientReview(context);
    default:
      return { outcome: "pass", detail: "No check defined." };
  }
}

function dailySpendingLimit({ payments, amount, proposedPayment }) {
  const limit = 5000;
  const spentToday = sumRecentCompleted(payments, proposedPayment.id);
  const projected = spentToday + amount;

  if (projected > limit) {
    return {
      outcome: "blocked",
      detail: `Daily limit exceeded: $${projected.toFixed(
        2
      )} of $${limit.toFixed(2)} (already spent: $${spentToday.toFixed(2)}).`,
    };
  }
  return {
    outcome: "pass",
    detail: `$${projected.toFixed(2)} of $${limit.toFixed(2)} used today.`,
  };
}

function largePaymentApproval({ amount }) {
  const threshold = 1000;
  if (amount > threshold) {
    return {
      outcome: "approval",
      detail: `Amount $${amount.toFixed(
        2
      )} exceeds the $${threshold.toFixed(2)} approval threshold.`,
    };
  }
  return {
    outcome: "pass",
    detail: `Within the $${threshold.toFixed(2)} auto-approval limit.`,
  };
}

function newRecipientReview({ payments, proposedPayment }) {
  const known = isKnownRecipient(payments, proposedPayment.recipient);
  if (!known) {
    return {
      outcome: "approval",
      detail: `Recipient "${proposedPayment.recipient}" has no prior completed payments.`,
    };
  }
  return { outcome: "pass", detail: "Recipient has prior payment history." };
}

export function decisionLabel(result) {
  switch (result) {
    case "allowed":
      return "Allowed";
    case "approval":
      return "Approval required";
    case "blocked":
      return "Blocked";
    default:
      return "Unknown";
  }
}