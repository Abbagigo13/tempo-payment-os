#!/usr/bin/env node
// examples/evaluate-policy.mjs
//
// Run: node examples/evaluate-policy.mjs
//
// Demonstrates the policy engine as a standalone function — no React,
// no browser, no network.

import { evaluatePayment } from "../src/lib/policyEngine.js";

const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();

const payments = [
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
];

const policies = [
  { id: 1, name: "Daily spending limit", enabled: true },
  { id: 2, name: "Large payment approval", enabled: true },
  { id: 3, name: "New recipient review", enabled: true },
];

const scenarios = [
  {
    label: "Small payment to known recipient",
    payment: { recipient: "Acme Technologies", amount: 100 },
  },
  {
    label: "Over $1,000 threshold",
    payment: { recipient: "Acme Technologies", amount: 1500 },
  },
  {
    label: "Over daily limit",
    payment: { recipient: "Acme Technologies", amount: 4000 },
  },
  {
    label: "New recipient",
    payment: { recipient: "Stranger Danger", amount: 50 },
  },
];

for (const { label, payment } of scenarios) {
  const decision = evaluatePayment(
    { ...payment, memo: "example" },
    payments,
    policies
  );
  console.log(`\n→ ${label}`);
  console.log(`  Result:  ${decision.result}`);
  console.log(`  Reason:  ${decision.reason}`);
  for (const policy of decision.evaluated) {
    console.log(`    [${policy.outcome}] ${policy.name} — ${policy.detail}`);
  }
}

console.log("");