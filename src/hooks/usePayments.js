import { useState } from "react";
import { initialPayments } from "../data/demoData";
import { evaluatePayment } from "../lib/policyEngine";
import { ACTIVITY_TYPES } from "../lib/activityLog";
import { formatCurrency } from "../lib/formatters";

export function usePayments(policies, activity) {
  const [payments, setPayments] = useState(initialPayments);

  function addPayment(payment) {
    const decision = evaluatePayment(payment, payments, policies);

    // Log every evaluation, regardless of outcome.
    activity?.record(ACTIVITY_TYPES.POLICY_EVALUATED, {
      recipient: payment.recipient,
      amount: payment.amount,
      result: decision.result,
      reason: decision.reason,
    });

    if (decision.result === "blocked") {
      activity?.record(ACTIVITY_TYPES.PAYMENT_BLOCKED, {
        recipient: payment.recipient,
        amount: payment.amount,
        reason: decision.reason,
      });
      return { ok: false, decision };
    }

    const newPayment = {
      ...payment,
      id: `PAY-${Date.now().toString().slice(-6)}`,
      status: "Pending",
      date: new Date().toISOString(),
      decision: decision.result,
      decisionReason: decision.reason,
    };

    setPayments((current) => [newPayment, ...current]);

    activity?.record(ACTIVITY_TYPES.PAYMENT_CREATED, {
      id: newPayment.id,
      recipient: newPayment.recipient,
      amount: newPayment.amount,
      amountFormatted: formatCurrency(newPayment.amount, newPayment.currency),
    });

    return { ok: true, payment: newPayment, decision };
  }

  function simulatePayment(id) {
    let changed = null;
    setPayments((current) =>
      current.map((p) => {
        if (p.id !== id) return p;
        changed = { from: p.status, to: "Completed", recipient: p.recipient };
        return { ...p, status: "Completed" };
      })
    );

    // Note: setPayments is async; `changed` is captured via closure above
    // but only reflects the mutation that just happened inside the updater.
    if (changed) {
      activity?.record(ACTIVITY_TYPES.STATUS_CHANGED, {
        id,
        from: changed.from,
        to: changed.to,
      });
    }
  }

  return { payments, addPayment, simulatePayment };
}