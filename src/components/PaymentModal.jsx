import { useMemo, useState } from "react";
import { X, Send, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { evaluatePayment, decisionLabel } from "../lib/policyEngine";

export default function PaymentModal({ onClose, onCreate, payments, policies }) {
  const [recipient, setRecipient] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");

  const preview = useMemo(() => {
    const numericAmount = Number(amount);
    if (
      !recipient.trim() ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return null;
    }
    return evaluatePayment(
      { recipient: recipient.trim(), amount: numericAmount, memo },
      payments || [],
      policies || []
    );
  }, [recipient, amount, memo, payments, policies]);

  function handleSubmit(event) {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (!recipient.trim()) {
      setError("Enter a recipient name.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    const result = onCreate({
      recipient: recipient.trim(),
      email: email.trim() || "Not provided",
      amount: numericAmount,
      currency: "USDC",
      memo: memo.trim() || "Manual payment",
    });

    if (result && result.ok === false) {
      setError(result.decision.reason);
      return;
    }

    onClose();
  }

  const blocked = preview?.result === "blocked";

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="payment-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>New payment</h2>
            <p>Create a simulated payment instruction.</p>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Recipient name
            <input
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="e.g. Acme Technologies"
            />
          </label>

          <label>
            Recipient email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="finance@example.com"
            />
          </label>

          <label>
            Amount (USDC)
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
            />
          </label>

          <label>
            Payment memo
            <input
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              placeholder="What is this payment for?"
            />
          </label>

          {preview && <PolicyPreview decision={preview} />}

          {error && <p className="form-error">{error}</p>}

          <div className="simulation-note">
            This creates a local demo record only. No funds will move.
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={blocked}
              style={
                blocked
                  ? { opacity: 0.5, cursor: "not-allowed" }
                  : undefined
              }
            >
              <Send size={16} />
              {blocked ? "Blocked by policy" : "Create payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PolicyPreview({ decision }) {
  const Icon =
    decision.result === "blocked"
      ? ShieldX
      : decision.result === "approval"
      ? ShieldAlert
      : ShieldCheck;

  return (
    <div className={`policy-preview ${decision.result}`}>
      <div className="policy-preview-header">
        <Icon size={15} />
        <strong>{decisionLabel(decision.result)}</strong>
      </div>
      <p className="policy-preview-reason">{decision.reason}</p>
      {decision.evaluated.length > 1 && (
        <ul className="policy-preview-list">
          {decision.evaluated.map((item) => (
            <li key={item.id}>
              <span className={`policy-preview-dot ${item.outcome}`} />
              {item.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}