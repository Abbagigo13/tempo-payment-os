import { useState } from "react";
import {
  Wallet,
  LogOut,
  AlertTriangle,
  Send,
  ExternalLink,
} from "lucide-react";
import { TESTNET_TOKENS, isValidAddress } from "../lib/tip20";

export default function WalletPanel({ wallet, onSend }) {
  const {
    providers,
    selected,
    status,
    address,
    isOnCorrectChain,
    error,
    connect,
    disconnect,
    switchChain,
  } = wallet;

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [tokenKey, setTokenKey] = useState("pathUSD");
  const [confirming, setConfirming] = useState(false);
  const [sendState, setSendState] = useState({ status: "idle" });

  const canSend =
    status === "connected" &&
    isOnCorrectChain &&
    isValidAddress(recipient) &&
    Number(amount) > 0;

  function resetSendForm() {
    setRecipient("");
    setAmount("");
    setSendState({ status: "idle" });
    setConfirming(false);
  }

  async function handleSend() {
    setConfirming(false);
    setSendState({ status: "signing" });
    const result = await onSend({
      provider: selected?.provider,
      from: address,
      to: recipient.trim(),
      tokenAddress: TESTNET_TOKENS[tokenKey],
      amount,
    });
    if (result.ok) {
      setSendState({ status: "sent", hash: result.hash });
    } else {
      setSendState({ status: "error", error: result.error });
    }
  }

  if (status !== "connected") {
    const hasProviders = providers.length > 0;
    return (
      <div className="panel wallet-panel">
        <div className="panel-title">
          <div className="panel-title-icon">
            <Wallet size={17} />
          </div>
          <div>
            <h3>Browser wallet</h3>
            <p>
              {hasProviders
                ? "Choose a wallet to sign transactions. Your keys never leave the extension."
                : "No EIP-6963 wallet detected. Install MetaMask, OKX, Rabby, or another browser wallet."}
            </p>
          </div>
        </div>

        {error && <p className="network-error">{error}</p>}

        {hasProviders && (
          <div className="wallet-list">
            {providers.map((p) => (
              <button
                key={p.info.uuid}
                className="wallet-option"
                onClick={() => connect(p)}
                disabled={status === "connecting"}
              >
                {p.info.icon && (
                  <img
                    src={p.info.icon}
                    alt=""
                    className="wallet-option-icon"
                  />
                )}
                <span className="wallet-option-name">
                  {p.info.name}
                  {selected?.info?.uuid === p.info.uuid && " (last used)"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="panel wallet-panel">
      <div className="panel-title">
        <div className="panel-title-icon positive">
          <Wallet size={17} />
        </div>
        <div>
          <h3>{selected?.info?.name || "Browser wallet"}</h3>
          <p className="wallet-address">{address}</p>
        </div>
      </div>

      <div className="wallet-row">
        <button className="secondary-button small" onClick={disconnect}>
          <LogOut size={13} />
          Disconnect
        </button>
      </div>

      {!isOnCorrectChain && (
        <div className="notice-panel">
          <AlertTriangle size={16} />
          <div>
            <p>
              Your wallet is on a different chain. Switch to{" "}
              <strong>Tempo Moderato</strong> (chain ID 42431) to send.
            </p>
            <button className="secondary-button small" onClick={switchChain}>
              Switch network
            </button>
          </div>
        </div>
      )}

      <div className="wallet-send">
        <h4>Send TIP-20 transfer</h4>

        <div className="wallet-send-form">
          <select
            className="filter-select"
            value={tokenKey}
            onChange={(event) => setTokenKey(event.target.value)}
          >
            <option value="pathUSD">pathUSD</option>
            <option value="alphaUSD">alphaUSD</option>
            <option value="betaUSD">betaUSD</option>
            <option value="thetaUSD">thetaUSD</option>
          </select>

          <input
            type="text"
            className="network-input"
            placeholder="Recipient 0x…"
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

        {recipient && !isValidAddress(recipient) && (
          <p className="form-error">Recipient must be a 0x… address.</p>
        )}

        {sendState.status === "error" && (
          <p className="form-error">{sendState.error}</p>
        )}

        {sendState.status === "sent" && (
          <div className="wallet-tx-result">
            <strong>Transaction sent</strong>
            <a
              href={`https://explore.testnet.tempo.xyz/tx/${sendState.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tx-link"
            >
              {sendState.hash.slice(0, 10)}…{sendState.hash.slice(-8)}
              <ExternalLink size={12} />
            </a>
            <button className="text-button" onClick={resetSendForm}>
              Send another
            </button>
          </div>
        )}

        {sendState.status !== "sent" && !confirming && (
          <div className="network-actions">
            <button
              className="primary-button"
              disabled={!canSend || sendState.status === "signing"}
              onClick={() => setConfirming(true)}
            >
              <Send size={14} />
              {sendState.status === "signing"
                ? "Waiting for wallet..."
                : "Review & send"}
            </button>
          </div>
        )}

        {confirming && (
          <div className="confirm-box">
            <strong>Confirm this transfer</strong>
            <p>
              You are about to send{" "}
              <strong>
                {amount} {tokenKey}
              </strong>{" "}
              to <code>{recipient}</code> on Tempo Moderato using{" "}
              <strong>{selected?.info?.name}</strong>.
            </p>
            <p className="muted-text">
              Your wallet will ask you to sign. This is a testnet transaction —
              no real funds move.
            </p>
            <div className="network-actions">
              <button
                className="secondary-button small"
                onClick={() => setConfirming(false)}
              >
                Cancel
              </button>
              <button className="primary-button" onClick={handleSend}>
                Confirm in wallet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}