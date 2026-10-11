import { useState } from "react";
import {
  ShieldCheck,
  RefreshCw,
  Send,
  ExternalLink,
  Check,
  X,
} from "lucide-react";
import {
  submitVaultPayment,
  approveVaultPayment,
  rejectVaultPayment,
} from "../lib/vault";
import { VAULT_ADDRESS } from "../lib/vaultConfig";
import { isValidAddress, parseTokenAmount } from "../lib/tip20";
import { encodeMemo, MEMO_MAX_BYTES } from "../lib/wallet";
import { formatDate } from "../lib/formatters";

const EXPLORER = "https://explore.testnet.tempo.xyz";
const STATUS_CLASS = {
  Pending: "pending",
  Executed: "completed",
  Rejected: "failed",
};

function short(address) {
  if (!address) return "";
  return address.slice(0, 6) + "..." + address.slice(-4);
}

function sameAddress(a, b) {
  return Boolean(a && b) && a.toLowerCase() === b.toLowerCase();
}

function Fact({ label, value }) {
  return (
    <div className="network-fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TxLink({ hash }) {
  return (
    <a
      href={`${EXPLORER}/tx/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="tx-link"
    >
      {hash.slice(0, 10)}...{hash.slice(-8)}
      <ExternalLink size={12} />
    </a>
  );
}

export default function VaultPanel({ wallet, vault }) {
  const { state, status, error, refresh } = vault;
  const {
    selected,
    status: walletStatus,
    address,
    isOnCorrectChain,
  } = wallet;

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [sendState, setSendState] = useState({ status: "idle" });
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const connected = walletStatus === "connected" && isOnCorrectChain;
  const isOwner = Boolean(connected && state && sameAddress(address, state.owner));
  const isApprover = Boolean(
    connected && state && sameAddress(address, state.approver)
  );

  const trimmedRecipient = recipient.trim();
  const trimmedMemo = memo.trim();
  const memoCheck = encodeMemo(trimmedMemo);
  const memoBytes = new TextEncoder().encode(trimmedMemo).length;

  let rawAmount = null;
  if (state && amount) {
    try {
      rawAmount = parseTokenAmount(amount, state.decimals);
    } catch {
      rawAmount = null;
    }
  }
  const amountValid = rawAmount !== null && rawAmount > 0n;
  const inputsValid =
    isValidAddress(trimmedRecipient) && amountValid && memoCheck.ok;

  // A preview of what the vault will do. The contract decides for real.
  let hint = null;
  if (state && amountValid) {
    if (rawAmount > state.remainingToday) {
      hint = {
        error: true,
        text: "This is more than the daily limit has left today. The vault will refuse it.",
      };
    } else if (rawAmount > state.approvalThreshold) {
      hint = {
        error: false,
        text: "Above the approval threshold: it will be held until the approver approves it.",
      };
    } else if (state.requireKnownRecipient) {
      hint = {
        error: false,
        text: "The vault requires known recipients. A new recipient is held for approval.",
      };
    } else {
      hint = {
        error: false,
        text: "Within the threshold: the vault will send it immediately.",
      };
    }
  }

  async function handleSubmit() {
    setActionError(null);
    setSendState({ status: "signing" });
    const result = await submitVaultPayment({
      provider: selected?.provider,
      from: address,
      to: trimmedRecipient,
      amount,
      memo: trimmedMemo,
      decimals: state.decimals,
    });
    if (result.ok) {
      setSendState({
        status: "sent",
        hash: result.hash,
        confirmed: result.confirmed,
      });
      setRecipient("");
      setAmount("");
      setMemo("");
      refresh();
    } else {
      setSendState({ status: "error", error: result.error, hash: result.hash });
    }
  }

  async function handleDecision(id, kind) {
    setActionError(null);
    setBusyId(id);
    const run = kind === "approve" ? approveVaultPayment : rejectVaultPayment;
    const result = await run({
      provider: selected?.provider,
      from: address,
      id,
      decimals: state.decimals,
    });
    setBusyId(null);
    if (!result.ok) {
      setActionError("Payment #" + id + ": " + result.error);
    }
    await refresh();
  }

  return (
    <div className="panel wallet-panel">
      <div className="panel-title">
        <div className={`panel-title-icon ${state ? "positive" : ""}`}>
          <ShieldCheck size={17} />
        </div>
        <div>
          <h3>Policy vault (on-chain)</h3>
          <p>
            A smart contract that enforces the daily limit and the approval
            threshold itself. A payment that breaks the rules cannot leave the
            vault, whatever this app does. Testnet demo, not audited.
          </p>
        </div>
      </div>

      {status === "error" && <p className="network-error">{error}</p>}
      {!state && status !== "error" && (
        <p className="muted-text">Reading the vault...</p>
      )}

      {state && (
        <>
          <div className="network-facts">
            <Fact
              label="Vault balance"
              value={`${state.balanceFormatted} ${state.symbol}`}
            />
            <Fact
              label="Daily limit"
              value={`${state.dailyLimitFormatted} ${state.symbol}`}
            />
            <Fact
              label="Left today"
              value={`${state.remainingTodayFormatted} ${state.symbol}`}
            />
            <Fact
              label="Approval above"
              value={`${state.approvalThresholdFormatted} ${state.symbol}`}
            />
            <Fact label="Payments" value={String(state.paymentCount)} />
          </div>
          <p className="muted-text">
            Vault{" "}
            <a
              href={`${EXPLORER}/address/${VAULT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tx-link"
            >
              {short(VAULT_ADDRESS)}
              <ExternalLink size={12} />
            </a>
            {" | Owner "}
            {short(state.owner)}
            {" | Approver "}
            {short(state.approver)}
          </p>
        </>
      )}

      <div className="network-actions">
        <button
          className="secondary-button small"
          onClick={refresh}
          disabled={status === "loading"}
        >
          <RefreshCw
            size={13}
            className={status === "loading" ? "spin" : ""}
          />
          {status === "loading" ? "Reading..." : "Refresh"}
        </button>
      </div>

      {state && walletStatus !== "connected" && (
        <p className="muted-text">
          Connect a wallet in the Browser wallet panel to use the vault. You
          can read its state without one.
        </p>
      )}
      {state && walletStatus === "connected" && !isOnCorrectChain && (
        <p className="form-error">
          Switch your wallet to Tempo Moderato to use the vault.
        </p>
      )}
      {state && connected && !isOwner && !isApprover && (
        <p className="muted-text">
          This wallet is neither the vault owner nor its approver, so it can
          only read.
        </p>
      )}

      {state && isOwner && (
        <div className="wallet-send">
          <h4>Send a payment through the vault</h4>

          <div className="wallet-send-form">
            <select className="filter-select" disabled>
              <option>{state.symbol}</option>
            </select>
            <input
              type="text"
              className="network-input"
              placeholder="Recipient 0x..."
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              disabled={sendState.status === "signing"}
            />
            <input
              type="number"
              className="wallet-amount"
              placeholder="0.00"
              min="0.000001"
              step="0.000001"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={sendState.status === "signing"}
            />
          </div>

          <div style={{ marginTop: "10px" }}>
            <input
              type="text"
              className="network-input"
              placeholder="Memo (optional)"
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              disabled={sendState.status === "signing"}
            />
            {trimmedMemo && (
              <p className={memoCheck.ok ? "muted-text" : "form-error"}>
                {memoCheck.ok
                  ? `Memo: ${memoBytes} of ${MEMO_MAX_BYTES} bytes`
                  : memoCheck.error}
              </p>
            )}
          </div>

          {recipient && !isValidAddress(trimmedRecipient) && (
            <p className="form-error">Recipient must be a 0x... address.</p>
          )}

          {hint && (
            <p className={hint.error ? "form-error" : "muted-text"}>
              {hint.text}
            </p>
          )}

          {sendState.status === "error" && (
            <div>
              <p className="form-error">{sendState.error}</p>
              {sendState.hash && <TxLink hash={sendState.hash} />}
            </div>
          )}

          {sendState.status === "sent" && (
            <div className="wallet-tx-result">
              <strong>
                {sendState.confirmed
                  ? "Transaction confirmed"
                  : "Submitted, confirmation pending"}
              </strong>
              <TxLink hash={sendState.hash} />
              <span className="muted-text">
                The list below shows whether it was sent or is waiting for
                approval.
              </span>
              <button
                className="text-button"
                onClick={() => setSendState({ status: "idle" })}
              >
                Send another
              </button>
            </div>
          )}

          {sendState.status !== "sent" && (
            <div className="network-actions">
              <button
                className="primary-button"
                disabled={!inputsValid || sendState.status === "signing"}
                onClick={handleSubmit}
              >
                <Send size={14} />
                {sendState.status === "signing"
                  ? "Waiting for wallet or confirmation..."
                  : "Submit through vault"}
              </button>
            </div>
          )}
        </div>
      )}

      {state && (
        <div className="wallet-send">
          <h4>Recent vault payments</h4>

          {actionError && <p className="form-error">{actionError}</p>}

          {state.payments.length === 0 ? (
            <p className="muted-text">
              No payments have gone through the vault yet.
            </p>
          ) : (
            <div className="table-wrapper">
              <table className="payment-table">
                <thead>
                  <tr>
                    <th>Payment</th>
                    <th>Recipient</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {state.payments.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="payment-id">#{p.id}</div>
                        <div className="payment-memo">
                          {p.memoText || "No memo"}
                        </div>
                      </td>
                      <td>
                        <div className="recipient-name" title={p.to}>
                          {short(p.to)}
                        </div>
                      </td>
                      <td className="amount-cell">
                        {p.amountFormatted} {state.symbol}
                      </td>
                      <td>
                        <span
                          className={`status-badge ${
                            STATUS_CLASS[p.status] || "pending"
                          }`}
                        >
                          <span className="status-dot" />
                          {p.status}
                        </span>
                      </td>
                      <td className="date-cell">
                        {formatDate(new Date(p.createdAt * 1000).toISOString())}
                      </td>
                      <td>
                        {p.status === "Pending" && isApprover && (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              className="secondary-button small"
                              onClick={() => handleDecision(p.id, "approve")}
                              disabled={busyId !== null}
                            >
                              <Check size={13} />
                              {busyId === p.id ? "Waiting..." : "Approve"}
                            </button>
                            <button
                              className="secondary-button small"
                              onClick={() => handleDecision(p.id, "reject")}
                              disabled={busyId !== null}
                            >
                              <X size={13} />
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
