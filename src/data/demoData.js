const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();

export const initialPayments = [
  {
    id: "PAY-1001",
    recipient: "Acme Technologies",
    email: "finance@acme.com",
    amount: 1250,
    currency: "USDC",
    status: "Completed",
    date: hoursAgo(4),
    memo: "October contractor payment",
  },
  {
    id: "PAY-1002",
    recipient: "Sarah Johnson",
    email: "sarah@example.com",
    amount: 450,
    currency: "USDC",
    status: "Pending",
    date: hoursAgo(2),
    memo: "Design services",
  },
  {
    id: "PAY-1003",
    recipient: "Cloud Services Ltd",
    email: "billing@cloud.com",
    amount: 800,
    currency: "USDC",
    status: "Completed",
    date: hoursAgo(20),
    memo: "Infrastructure invoice",
  },
  {
    id: "PAY-1004",
    recipient: "David Musa",
    email: "david@example.com",
    amount: 200,
    currency: "USDC",
    status: "Failed",
    date: hoursAgo(48),
    memo: "Freelance payout",
  },
];

export const initialPolicies = [
  {
    id: 1,
    name: "Daily spending limit",
    description: "Limit total outgoing payments to $5,000 per day.",
    enabled: true,
    type: "Spending",
  },
  {
    id: 2,
    name: "Large payment approval",
    description: "Require approval for payments above $1,000.",
    enabled: true,
    type: "Approval",
  },
  {
    id: 3,
    name: "New recipient review",
    description: "Review payments to recipients not previously used.",
    enabled: false,
    type: "Security",
  },
];

export const workflows = [
  {
    id: 1,
    name: "Weekly contractor payouts",
    description: "Prepare weekly contractor payments for review.",
    schedule: "Every Friday",
    status: "Active",
    paymentTemplate: {
      recipient: "Acme Technologies",
      email: "finance@acme.com",
      amount: 800,
      currency: "USDC",
      memo: "Weekly contractor payout",
    },
  },
  {
    id: 2,
    name: "Monthly cloud settlement",
    description: "Prepare the monthly infrastructure invoice.",
    schedule: "First day of each month",
    status: "Paused",
    paymentTemplate: {
      recipient: "Cloud Services Ltd",
      email: "billing@cloud.com",
      amount: 450,
      currency: "USDC",
      memo: "Monthly cloud settlement",
    },
  },
];