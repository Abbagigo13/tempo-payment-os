import { X, Play, ShieldCheck, ShieldAlert, ShieldX, Check } from "lucide-react";
import { formatCurrency, formatDate } from "../lib/formatters";
import { evaluatePayment, decisionLabel } from "../lib/policyEngine";

export default function PaymentDrawer({
  payment,
  payments,
  policies,
  onClose,
  onSimulate,
}) {
  if (!payment) return null;

  // Re-evaluate against current policies so the drawer reflects
  // the policy set at the time of viewing, not creation.
  const decision = evaluatePayment(payment, payments, policies);

  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside
        className="payment-drawer"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="drawer-header">
          <div>
            <div className="drawer-id">{payment.id}</div>
            <h2>{payment.recipient}</h2>
            <p className="drawer-email">{payment.email}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </header>

        <section className="drawer-summary">
          <div className="drawer-amount">
            {formatCurrency(payment.amount, payment.currency)}
          </div>
          <span className={`status-badge ${payment.status.toLowerCase()}`}>
            <span className="status-dot" />
            {payment.status}
          </span>
        </section>

        <section className="drawer-section">
          <h3>Details</h3>
          <dl className="drawer-grid">
            <dt>Memo</dt>
            <dd>{payment.memo || "—"}</dd>
            <dt>Created</dt>
            <dd>{formatDate(payment.date)}</dd>
            <dt>Currency</dt>
            <dd>{payment.currency || "USDC"}</dd>
          </dl>
        </section>

        <section className="drawer-section">
          <h3>Policy evaluation</h3>
          <div className={`drawer-decision ${decision.result}`}>
            <DecisionIcon result={decision.result} />
            <div>
              <strong>{decisionLabel(decision.result)}</strong>
              <p>{decision.reason}</p>
            </div>
          </div>

          {decision.evaluated.length > 0 && (
            <ul className="drawer-policy-list">
              {decision.evaluated.map((item) => (
                <li key={item.id}>
                  <span className={`policy-preview-dot ${item.outcome}`} />
                  <div>
                    <strong>{item.name}</strong>
                    <p>{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="drawer-section">
          <h3>Lifecycle</h3>
          <ol className="drawer-timeline">
            <TimelineStep
              label="Created"
              time={formatDate(payment.date)}
              state="done"
            />
            <TimelineStep
              label="Policy evaluated"
              detail={decisionLabel(decision.result)}
              state="done"
            />
            <TimelineStep
              label="Execution"
              detail={
                payment.status === "Completed"
                  ? "Simulated successfully"
                  : payment.status === "Failed"
                  ? "Failed"
                  : "Awaiting execution"
              }
              state={
                payment.status === "Completed"
                  ? "done"
                  : payment.status === "Failed"
                  ? "failed"
                  : "pending"
              }
            />
          </ol>
        </section>

        {payment.status === "Pending" && (
          <footer className="drawer-footer">
            <button
              className="primary-button"
              onClick={() => onSimulate(payment.id)}
            >
              <Play size={16} />
              Simulate success
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}

function DecisionIcon({ result }) {
  if (result === "blocked") return <ShieldX size={18} />;
  if (result === "approval") return <ShieldAlert size={18} />;
  return <ShieldCheck size={18} />;
}

function TimelineStep({ label, time, detail, state }) {
  return (
    <li className={`timeline-step ${state}`}>
      <span className="timeline-dot">
        {state === "done" && <Check size={10} />}
      </span>
      <div>
        <strong>{label}</strong>
        {(time || detail) && <p>{time || detail}</p>}
      </div>
    </li>
  );
}