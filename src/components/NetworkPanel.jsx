import { useState } from "react";
import { RefreshCw, Wifi, WifiOff, Loader2, Search } from "lucide-react";
import { formatDate } from "../lib/formatters";

export default function NetworkPanel({ tempo }) {
  const { status, info, error, refresh, balance, balanceError, balanceLoading, checkBalance } = tempo;
  const [address, setAddress] = useState("");
  const [tokenKey, setTokenKey] = useState("pathUSD");

  const Icon =
    status === "connected" ? Wifi : status === "connecting" ? Loader2 : WifiOff;
  const tone =
    status === "connected"
      ? "positive"
      : status === "connecting"
      ? "neutral"
      : "negative";

  return (
    <div className="panel network-panel">
      <div className="panel-title">
        <div className={`panel-title-icon ${tone}`}>
          <Icon size={17} className={status === "connecting" ? "spin" : ""} />
        </div>
        <div>
          <h3>Tempo network</h3>
          <p>
            Read-only connection to the public testnet RPC. No wallet, no
            signing, no transactions.
          </p>
        </div>
      </div>

      <div className="network-facts">
        <NetworkFact label="Status" value={statusLabel(status)} tone={tone} />
        <NetworkFact label="Chain ID" value={info ? String(info.chainId) : "—"} />
        <NetworkFact
          label="Latest block"
          value={info ? `#${info.blockNumber.toLocaleString()}` : "—"}
        />
        <NetworkFact label="Latency" value={info ? `${info.latencyMs} ms` : "—"} />
        <NetworkFact
          label="Last checked"
          value={info ? formatDate(info.lastChecked) : "—"}
        />
      </div>

      {status === "error" && (
        <p className="network-error">
          {error || "Unable to reach Tempo RPC."} — simulation mode remains
          available.
        </p>
      )}

      <div className="network-actions">
        <button
          className="secondary-button small"
          onClick={refresh}
          disabled={status === "connecting"}
        >
          <RefreshCw size={13} className={status === "connecting" ? "spin" : ""} />
          {status === "connecting" ? "Checking..." : "Refresh"}
        </button>
      </div>

      <div className="network-balance">
        <h4>Read a TIP-20 balance</h4>
        <div className="network-balance-form">
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
            placeholder="0x… address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
          <button
            className="secondary-button small"
            onClick={() => checkBalance(address, tokenKey)}
            disabled={balanceLoading || !address.trim()}
          >
            <Search size={13} />
            {balanceLoading ? "Reading..." : "Read"}
          </button>
        </div>

        {balanceError && <p className="network-error">{balanceError}</p>}

        {balance && (
          <div className="network-balance-result">
            <span className="balance-label">
              {balance.symbol || balance.token} balance
            </span>
            <strong>{balance.formatted}</strong>
            <span className="balance-address">{balance.address}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function NetworkFact({ label, value, tone }) {
  return (
    <div className="network-fact">
      <span>{label}</span>
      <strong className={tone ? `tone-${tone}` : ""}>{value}</strong>
    </div>
  );
}

function statusLabel(status) {
  switch (status) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting...";
    case "error":
      return "Unreachable";
    default:
      return "Idle";
  }
}