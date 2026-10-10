import { useEffect, useState } from "react";
import { initialPayments } from "../data/demoData";
import { evaluatePayment } from "../lib/policyEngine";
import { ACTIVITY_TYPES } from "../lib/activityLog";
import { formatCurrency } from "../lib/formatters";
import { loadStored, saveStored } from "../lib/storage";

// Bump the version if the shape of a payment ever changes.
const STORAGE_KEY = "payments:v1";

function isValidPaymentList(value) {
  return (
    Array.isArray(value) &&
    value.every(
      (p) =>
        p &&
        typeof p.id === "string" &&
        typeof p.status === "string" &&
        Number.isFinite(Number(p.amount))
    )
  );
}

export function usePayments(policies, activity) {
  const [payments, setPayments] = useState(() =>
    loadStored(STORAGE_KEY, initialPayments, isValidPaymentList)
  );

  // Save the payment history whenever it changes.
  useEffect(() => {
    saveStored(STORAGE_KEY, payments);
  }, [payments]);

  // Log every evaluation, regardless of outcome.
  function logEvaluation(payment, decision) {
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
    }
  }

  function buildPayment(payment, decision, status) {
    return {
      ...payment,
      id: `PAY-${Date.now().toString().slice(-6)}`,
      status,
      date: new Date().toISOString(),
      decision: decision.result,
      decisionReason: decision.reason,
    };
  }

  function logCreated(newPayment) {
    activity?.record(ACTIVITY_TYPES.PAYMENT_CREATED, {
      id: newPayment.id,
      recipient: newPayment.recipient,
      amount: newPayment.amount,
      amountFormatted: formatCurrency(newPayment.amount, newPayment.currency),
    });
  }

  // Check a proposed payment against the current policies.
  // Pure: records and logs nothing.
  function checkPayment(payment) {
    return evaluatePayment(payment, payments, policies);
  }

  function addPayment(payment) {
    const decision = checkPayment(payment);

    logEvaluation(payment, decision);

    if (decision.result === "blocked") {
      return { ok: false, decision };
    }

    const newPayment = buildPayment(payment, decision, "Pending");

    setPayments((current) => [newPayment, ...current]);
    logCreated(newPayment);

    return { ok: true, payment: newPayment, decision };
  }

  // Run a workflow: send its payment template through the policy engine
  // like any other payment.
  // Returns { outcome: "allowed" | "approval" | "blocked", message, paymentId? }
  function runWorkflow(workflow) {
    const template = workflow?.paymentTemplate;
    if (!template) {
      return {
        outcome: "blocked",
        message: "This workflow has no payment template.",
      };
    }

    const result = addPayment({ ...template });

    return {
      outcome: result.decision.result,
      message: result.decision.reason,
      paymentId: result.payment?.id,
    };
  }

  // Log a wallet transfer that was stopped by a policy.
  function recordBlockedTransfer(payment, decision) {
    logEvaluation(payment, decision);
  }

  // Add a wallet transfer to the payment history.
  // status: "Completed" | "Pending" | "Failed"
  function recordTransfer({ payment, decision, status, txHash }) {
    logEvaluation(payment, decision);

    const newPayment = { ...buildPayment(payment, decision, status), txHash };

    setPayments((current) => [newPayment, ...current]);
    logCreated(newPayment);

    return newPayment;
  }

  function simulatePayment(id) {
    // Read the payment from current state, not from inside the state
    // updater, so the status change can be logged reliably.
    const target = payments.find((p) => p.id === id);
    if (!target || target.status === "Completed") return;

    setPayments((current) =>
      current.map((p) => (p.id === id ? { ...p, status: "Completed" } : p))
    );

    activity?.record(ACTIVITY_TYPES.STATUS_CHANGED, {
      id,
      from: target.status,
      to: "Completed",
    });
  }

  return {
    payments,
    addPayment,
    runWorkflow,
    simulatePayment,
    checkPayment,
    recordTransfer,
    recordBlockedTransfer,
  };
}