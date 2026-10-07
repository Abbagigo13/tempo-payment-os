import { MoreHorizontal } from "lucide-react";
import { formatCurrency, formatDate } from "../lib/formatters";
import { decisionLabel } from "../lib/policyEngine";

export default function PaymentTable({ payments, limit, onSelect }) {
  const displayedPayments = limit ? payments.slice(0, limit) : payments;

  return (
    <div className="table-wrapper">
      <table className="payment-table">
        <thead>
          <tr>
            <th>Payment</th>
            <th>Recipient</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Decision</th>
            <th>Date</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {displayedPayments.map((payment) => (
            <tr
              key={payment.id}
              onClick={onSelect ? () => onSelect(payment) : undefined}
              style={onSelect ? { cursor: "pointer" } : undefined}
            >
              <td>
                <div className="payment-id">{payment.id}</div>
                <div className="payment-memo">{payment.memo}</div>
              </td>
              <td>
                <div className="recipient-name">{payment.recipient}</div>
                <div className="recipient-email">{payment.email}</div>
              </td>
              <td className="amount-cell">
                {formatCurrency(payment.amount, payment.currency)}
              </td>
              <td>
                <span className={`status-badge ${payment.status.toLowerCase()}`}>
                  <span className="status-dot" />
                  {payment.status}
                </span>
              </td>
              <td>
                {payment.decision ? (
                  <span
                    className={`decision-badge ${payment.decision}`}
                    title={payment.decisionReason || ""}
                  >
                    {decisionLabel(payment.decision)}
                  </span>
                ) : (
                  <span className="decision-badge none">—</span>
                )}
              </td>
              <td className="date-cell">{formatDate(payment.date)}</td>
              <td>
                <button
                  className="table-action"
                  aria-label="Payment options"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (onSelect) onSelect(payment);
                  }}
                >
                  <MoreHorizontal size={18} />
                </button>
              </td>
            </tr>
          ))}
          {displayedPayments.length === 0 && (
            <tr>
              <td colSpan="7" className="empty-state">
                No payments found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}