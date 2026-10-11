import {
  X,
  Play,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Check,
  ExternalLink,
} from "lucide-react";
import { formatCurrency, formatDate } from "../lib/formatters";
import { evaluatePayment, decisionLabel } from "../lib/policyEngine";

const EXPLORER = "https://explore.testnet.tempo.xyz";

// Statuses that reuse another status's colors.
const STATUS_CLASS = { Rejected: "failed" };

export default function PaymentDrawer({
  payment,
  payments,
  policies,
  onClose,
  onSimulate,
}) {
  if (!payment) return null;

  const isVault = payment.source === "vault";

  // Re-evaluate against current policies so the drawer reflects
  // the policy set at the time of viewing, not creation.
  // Vault payments are decided on-chain, so the browser engine is not used.
  const decision = isVault
    ? null
    : evaluatePayment(payment, payments, policies);

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
          <span
            className={`status-badge ${
              STATUS_CLASS[payment.status] || payment.status.toLowerCase()
            }`}
          >
            <span className="status-dot" />
            {payment.status}
          </span>
        </section>

        <section className="drawer-section">
          <h3>Details</h3>
          <dl className="drawer-grid">
            <dt>Memo</dt>
            <dd>{payment.memo || "\u2014"}</dd>
            <dt>Created</dt>
            <dd>{formatDate(payment.date)}</dd>
            <dt>Currency</dt>
            <dd>{payment.currency || "USDC"}</dd>
            {isVault && (
              <>
                <dt>Recipient address</dt>
                <dd>{payment.address}</dd>
                <dt>Source</dt>
                <dd>On-chain policy vault</dd>
              </>
            )}
          </dl>
        </section>

        {isVault ? (
          <>
            <section className="drawer-section">
              <h3>Policy evaluation</h3>
              <div className="drawer-decision allowed">
                <ShieldCheck size={18} />
                <div>
                  <strong>Enforced on-chain</strong>
                  <p>
                    This payment went through the policy vault, which applies
                    its daily limit and approval threshold inside the
                    contract. This app's browser policy engine does not
                    evaluate it.
                  </p>
                </div>
              </div>
              <p className="muted-text">
                <a
                  href={`${EXPLORER}/address/${payment.vaultAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tx-link"
                >
                  View the vault in the explorer
                  <ExternalLink size={12} />
                </a>
              </p>
            </section>

            <section className="drawer-section">
              <h3>Lifecycle</h3>
              <ol className="drawer-timeline">
                <TimelineStep
                  label="Submitted to the vault"
                  time={formatDate(payment.date)}
                  state="done"
                />
                <TimelineStep
                  label="Vault rules"
                  detail="Checked on-chain"
                  state="done"
                />
                <TimelineStep
                  label="Execution"
                  detail={
                    payment.status === "Completed"
                      ? "Executed on-chain"
                      : payment.status === "Rejected"
                      ? "Rejected by the approver"
                      : "Waiting for the vault approver"
                  }
                  state={
                    payment.status === "Completed"
                      ? "done"
                      : payment.status === "Rejected"
                      ? "failed"
                      : "pending"
                  }
                />
              </ol>
            </section>
          </>
        ) : (
          <>
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
                      <span
                        className={`policy-preview-dot ${item.outcome}`}
                      />
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
          </>
        )}

        {!isVault && payment.status === "Pending" && (
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
