// Turns the vault's on-chain payments into the same shape as the app's own
// payment records, for DISPLAY ONLY on the Payments page.
//
// These records are never fed into the browser policy engine: the vault
// enforces its own rules on-chain, and counting them against the browser's
// simulated daily limit would be wrong.

const STATUS_MAP = {
  Executed: "Completed",
  Pending: "Pending",
  Rejected: "Rejected",
};

function shortAddress(address) {
  return address.slice(0, 6) + "..." + address.slice(-4);
}

export function vaultPaymentsAsRecords(state) {
  if (!state || !Array.isArray(state.payments)) return [];

  return state.payments
    .filter((p) => STATUS_MAP[p.status])
    .map((p) => ({
      id: `VAULT-${p.id}`,
      source: "vault",
      recipient: shortAddress(p.to),
      address: p.to,
      email: "On-chain vault payment",
      amount: Number(p.amountFormatted),
      currency: "USD",
      status: STATUS_MAP[p.status],
      date: new Date(p.createdAt * 1000).toISOString(),
      memo: p.memoText || "No memo",
      vaultAddress: state.address,
    }));
}
