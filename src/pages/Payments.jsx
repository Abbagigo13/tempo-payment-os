import { useState } from "react";
import { Plus, Search, Play } from "lucide-react";
import PaymentTable from "../components/PaymentTable";
import PaymentModal from "../components/PaymentModal";
import PaymentDrawer from "../components/PaymentDrawer";
import ActivityPanel from "../components/ActivityPanel";
import { mergePaymentLists } from "../lib/vaultPayments";

export default function Payments({
  payments,
  vaultPayments = [],
  policies,
  addPayment,
  simulatePayment,
  activity,
}) {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedPayment, setSelectedPayment] = useState(null);

  // The app's own payments plus read-only records of on-chain vault payments.
  const allPayments = mergePaymentLists(payments, vaultPayments);

  const query = search.toLowerCase();
  const filteredPayments = allPayments.filter((payment) => {
    const matchesSearch =
      payment.id.toLowerCase().includes(query) ||
      payment.recipient.toLowerCase().includes(query) ||
      (payment.memo || "").toLowerCase().includes(query) ||
      (payment.address || "").toLowerCase().includes(query);

    const matchesFilter = filter === "All" || payment.status === filter;
    return matchesSearch && matchesFilter;
  });

  const liveSelected = selectedPayment
    ? allPayments.find((p) => p.id === selectedPayment.id) || null
    : null;

  return (
    <div className="page-content">
      <div className="page-toolbar">
        <div>
          <h2>Payment instructions</h2>
          <p>
            Simulated payments, plus read-only records of payments sent through
            the on-chain vault.
          </p>
        </div>
        <button className="primary-button" onClick={() => setShowModal(true)}>
          <Plus size={17} />
          New payment
        </button>
      </div>

      <div className="panel">
        <div className="table-toolbar">
          <div className="search-field">
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search payments..."
            />
          </div>

          <select
            className="filter-select"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option>All</option>
            <option>Pending</option>
            <option>Completed</option>
            <option>Failed</option>
            <option>Rejected</option>
          </select>
        </div>

        <PaymentTable
          payments={filteredPayments}
          onSelect={setSelectedPayment}
        />
      </div>

      <div className="panel simulator-panel">
        <div>
          <h3>Payment simulator</h3>
          <p>
            Complete a pending payment locally to test the interface.
            This does not send a blockchain transaction. Vault payments are
            decided on-chain by the vault approver and cannot be simulated.
          </p>
        </div>
        <div className="simulator-list">
          {payments
            .filter((payment) => payment.status === "Pending")
            .map((payment) => (
              <div className="simulator-item" key={payment.id}>
                <div>
                  <strong>{payment.recipient}</strong>
                  <span>{payment.id}</span>
                </div>
                <button
                  className="secondary-button small"
                  onClick={() => simulatePayment(payment.id)}
                >
                  <Play size={14} />
                  Simulate success
                </button>
              </div>
            ))}
          {payments.every((payment) => payment.status !== "Pending") && (
            <p className="muted-text">No pending payments to simulate.</p>
          )}
        </div>
      </div>

      <ActivityPanel events={activity.events} onClear={activity.clear} />

      {showModal && (
        <PaymentModal
          payments={payments}
          policies={policies}
          onClose={() => setShowModal(false)}
          onCreate={addPayment}
        />
      )}

      {liveSelected && (
        <PaymentDrawer
          payment={liveSelected}
          payments={payments}
          policies={policies}
          onClose={() => setSelectedPayment(null)}
          onSimulate={simulatePayment}
        />
      )}
    </div>
  );
}
