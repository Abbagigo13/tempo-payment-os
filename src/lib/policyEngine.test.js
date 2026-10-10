import { describe, it, expect } from "vitest";
import { evaluatePayment, decisionLabel } from "./policyEngine";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const policiesAllOn = [
  {
    id: 1,
    name: "Daily spending limit",
    enabled: true,
  },
  {
    id: 2,
    name: "Large payment approval",
    enabled: true,
  },
  {
    id: 3,
    name: "New recipient review",
    enabled: true,
  },
];

// A small payment history used as the "already-spent" base.
// Two completed payments: $1,250 + $800 = $2,050.
// One pending payment: $450. Pending payments count toward the daily
// limit, so the base total is $2,500.
// One completed payment to a known recipient: "Acme Technologies".
const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();

const basePayments = [
  {
    id: "PAY-1001",
    recipient: "Acme Technologies",
    amount: 1250,
    status: "Completed",
    date: hoursAgo(4),
  },
  {
    id: "PAY-1003",
    recipient: "Cloud Services Ltd",
    amount: 800,
    status: "Completed",
    date: hoursAgo(20),
  },
  {
    id: "PAY-1002",
    recipient: "Sarah Johnson",
    amount: 450,
    status: "Pending",
    date: hoursAgo(2),
  },
];

const newPayment = (overrides = {}) => ({
  id: "PAY-NEW",
  recipient: "Acme Technologies",
  amount: 100,
  memo: "test",
  ...overrides,
});

// ---------------------------------------------------------------------------
// Core decision outcomes
// ---------------------------------------------------------------------------

describe("evaluatePayment — outcomes", () => {
  it("allows a small payment to a known recipient", () => {
    const result = evaluatePayment(newPayment(), basePayments, policiesAllOn);
    expect(result.result).toBe("allowed");
    expect(result.reason).toBe("All policies passed.");
  });

  it("requires approval above $1,000", () => {
    const result = evaluatePayment(
      newPayment({ amount: 1500 }),
      basePayments,
      policiesAllOn
    );
    expect(result.result).toBe("approval");
    expect(result.reason).toContain("$1500.00");
    expect(result.reason).toContain("$1000.00");
  });

  it("blocks when the projected daily total exceeds $5,000", () => {
    // $2,500 already spent or pending + $4,000 = $6,500 > $5,000
    const result = evaluatePayment(
      newPayment({ amount: 4000 }),
      basePayments,
      policiesAllOn
    );
    expect(result.result).toBe("blocked");
    expect(result.reason).toContain("$6500.00");
    expect(result.reason).toContain("$5000.00");
  });

  it("requires approval for a new recipient when policy 3 is enabled", () => {
    const result = evaluatePayment(
      newPayment({ recipient: "Stranger Danger", amount: 50 }),
      basePayments,
      policiesAllOn
    );
    expect(result.result).toBe("approval");
    expect(result.reason).toContain("Stranger Danger");
  });
});

// ---------------------------------------------------------------------------
// Precedence
// ---------------------------------------------------------------------------

describe("evaluatePayment — precedence", () => {
  it("block beats approval when both fire", () => {
    // Over $1,000 (approval) AND pushes daily total over $5,000 (block).
    const result = evaluatePayment(
      newPayment({ amount: 3500 }), // 2500 + 3500 = 6000 > 5000
      basePayments,
      policiesAllOn
    );
    expect(result.result).toBe("blocked");
  });

  it("approval beats allowed when only approval fires", () => {
    const result = evaluatePayment(
      newPayment({ amount: 1500 }), // over $1,000, under daily limit
      basePayments,
      policiesAllOn
    );
    expect(result.result).toBe("approval");
  });
});

// ---------------------------------------------------------------------------
// Policy enable/disable
// ---------------------------------------------------------------------------

describe("evaluatePayment — disabled policies", () => {
  it("ignores the large payment approval policy when disabled", () => {
    const policies = policiesAllOn.map((p) =>
      p.id === 2 ? { ...p, enabled: false } : p
    );
    const result = evaluatePayment(
      newPayment({ amount: 1500 }),
      basePayments,
      policies
    );
    expect(result.result).toBe("allowed");
  });

  it("ignores the new recipient policy when disabled", () => {
    const policies = policiesAllOn.map((p) =>
      p.id === 3 ? { ...p, enabled: false } : p
    );
    const result = evaluatePayment(
      newPayment({ recipient: "Stranger Danger", amount: 50 }),
      basePayments,
      policies
    );
    expect(result.result).toBe("allowed");
  });

  it("allows everything when no policies are enabled", () => {
    const policies = policiesAllOn.map((p) => ({ ...p, enabled: false }));
    const result = evaluatePayment(
      newPayment({ amount: 999999 }),
      basePayments,
      policies
    );
    expect(result.result).toBe("allowed");
    expect(result.evaluated).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Daily window and history filters
// ---------------------------------------------------------------------------

describe("evaluatePayment — daily limit window", () => {
  it("ignores Failed payments and payments older than 24 hours", () => {
    const payments = [
      {
        id: "PAY-OLD",
        recipient: "Acme Technologies",
        amount: 4900,
        status: "Completed",
        date: hoursAgo(48), // outside 24h window
      },
      {
        id: "PAY-FAILED",
        recipient: "Acme Technologies",
        amount: 4900,
        status: "Failed", // not counted
        date: hoursAgo(2),
      },
    ];
    // Nothing recent that counts, so $0 spent → $4,500 is fine.
    const result = evaluatePayment(
      newPayment({ amount: 4500 }),
      payments,
      policiesAllOn
    );
    expect(result.result).toBe("approval"); // over $1,000, under $5,000 daily
  });

  it("counts Pending payments toward the daily limit", () => {
    const payments = [
      {
        id: "PAY-PENDING",
        recipient: "Acme Technologies",
        amount: 4900,
        status: "Pending", // counted
        date: hoursAgo(2),
      },
    ];
    // $4,900 pending + $200 = $5,100 > $5,000
    const result = evaluatePayment(
      newPayment({ amount: 200 }),
      payments,
      policiesAllOn
    );
    expect(result.result).toBe("blocked");
    const dailyLimit = result.evaluated.find((e) => e.id === 1);
    expect(dailyLimit.outcome).toBe("blocked");
  });

  it("counts payments with a missing or invalid date", () => {
    const payments = [
      {
        id: "PAY-BAD-DATE",
        recipient: "Acme Technologies",
        amount: 3000,
        status: "Completed",
        date: "not-a-date", // invalid → counted to be safe
      },
      {
        id: "PAY-NO-DATE",
        recipient: "Acme Technologies",
        amount: 2000,
        status: "Completed",
        // no date field at all → counted to be safe
      },
    ];
    // $3,000 + $2,000 + $100 = $5,100 > $5,000
    const result = evaluatePayment(
      newPayment({ amount: 100 }),
      payments,
      policiesAllOn
    );
    expect(result.result).toBe("blocked");
    const dailyLimit = result.evaluated.find((e) => e.id === 1);
    expect(dailyLimit.outcome).toBe("blocked");
  });

  it("excludes the payment being evaluated from the sum", () => {
    // If we re-evaluate PAY-1001, it shouldn't double-count itself.
    const result = evaluatePayment(
      {
        id: "PAY-1001",
        recipient: "Acme Technologies",
        amount: 1250,
        memo: "re-evaluating existing",
      },
      basePayments,
      policiesAllOn
    );

    // Result should still require approval (amount > $1,000).
    expect(result.result).toBe("approval");

    // Others count as $800 (PAY-1003) + $450 (PAY-1002 pending) = $1,250.
    // Adding this payment's $1,250 gives $2,500. If PAY-1001 were counted
    // twice, this would show $3,750.
    const dailyLimit = result.evaluated.find((e) => e.id === 1);
    expect(dailyLimit.detail).toContain("$2500.00");
  });

  it("each evaluated entry has name, outcome, and detail", () => {
    const result = evaluatePayment(newPayment(), basePayments, policiesAllOn);
    for (const entry of result.evaluated) {
      expect(typeof entry.name).toBe("string");
      expect(["pass", "approval", "blocked"]).toContain(entry.outcome);
      expect(typeof entry.detail).toBe("string");
      expect(entry.detail.length).toBeGreaterThan(0);
    }
  });

  it("outcomes match the entries correctly when blocked", () => {
    const result = evaluatePayment(
      newPayment({ amount: 4000 }),
      basePayments,
      policiesAllOn
    );
    const policy1 = result.evaluated.find((e) => e.id === 1);
    expect(policy1.outcome).toBe("blocked");
  });
});

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe("evaluatePayment — input validation", () => {
  it("blocks invalid amounts (NaN, zero, negative)", () => {
    for (const amount of ["abc", 0, -5000]) {
      const result = evaluatePayment(
        newPayment({ amount }),
        basePayments,
        policiesAllOn
      );
      expect(result.result).toBe("blocked");
      expect(result.reason).toContain("positive number");
    }
  });

  it("does not crash when the recipient is missing", () => {
    const result = evaluatePayment(
      newPayment({ recipient: undefined }),
      basePayments,
      policiesAllOn
    );
    expect(result.result).toBe("approval"); // unknown recipient
  });

  it("treats string policy IDs the same as numeric ones", () => {
    const stringIdPolicies = policiesAllOn.map((p) => ({
      ...p,
      id: String(p.id),
    }));
    // $2,500 + $4,000 = $6,500 > $5,000 → must still be blocked
    const result = evaluatePayment(
      newPayment({ amount: 4000 }),
      basePayments,
      stringIdPolicies
    );
    expect(result.result).toBe("blocked");
  });
});

// ---------------------------------------------------------------------------
// decisionLabel helper
// ---------------------------------------------------------------------------

describe("decisionLabel", () => {
  it("maps each result to a human label", () => {
    expect(decisionLabel("allowed")).toBe("Allowed");
    expect(decisionLabel("approval")).toBe("Approval required");
    expect(decisionLabel("blocked")).toBe("Blocked");
    expect(decisionLabel("something-else")).toBe("Unknown");
  });
});