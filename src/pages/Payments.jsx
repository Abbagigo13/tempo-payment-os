import { useState } from "react";
import { Plus, Search, Play } from "lucide-react";
import PaymentTable from "../components/PaymentTable";
import PaymentModal from "../components/PaymentModal";
import PaymentDrawer from "../components/PaymentDrawer";
import ActivityPanel from "../components/ActivityPanel";

export default function Payments({
  payments,
  policies,
  addPayment,
  simulatePayment,
  activity,
}) {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedPayment, setSelectedPayment] = useState(null);

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.id.toLowerCase().includes(search.toLowerCase()) ||
      payment.recipient.toLowerCase().includes(search.toLowerCase()) ||
      payment.memo.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filter === "All" || payment.status === filter;
    return matchesSearch && matchesFilter;
  });

  const liveSelected = selectedPayment
    ? payments.find((p) => p.id === selectedPayment.id) || null
    : null;

  return (
    <div className="page-content">
      <div className="page-toolbar">
        <div>
          <h2>Payment instructions</h2>
          <p>Manage your simulated outgoing payments.</p>
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
            This does not send a blockchain transaction.
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