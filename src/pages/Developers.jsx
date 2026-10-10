import { useMemo, useState } from "react";
import { Copy, Code2, Check, Play } from "lucide-react";
import { evaluatePayment, decisionLabel } from "../lib/policyEngine";

const SNIPPETS = {
  evaluate: `import { evaluatePayment } from "./lib/policyEngine";

const decision = evaluatePayment(
  {
    recipient: "Acme Technologies",
    amount: 1500,
    memo: "Contractor payout",
  },
  payments,   // current payment history
  policies    // enabled policy set
);

// → {
//     result: "approval",
//     reason: "Amount $1500.00 exceeds the $1000.00 approval threshold.",
//     evaluated: [
//       { id: 1, name: "Daily spending limit", outcome: "pass", detail: "..." },
//       { id: 2, name: "Large payment approval", outcome: "approval", detail: "..." }
//     ]
//   }`,

  tip20: `import { publicClient } from "./lib/tempo";
import { TIP20_ABI } from "./lib/tip20Abi";
import { getTokenDecimals, formatTokenAmount } from "./lib/tip20";

const token = "0x20c0000000000000000000000000000000000000"; // pathUSD

const raw = await publicClient.readContract({
  address: token,
  abi: TIP20_ABI,
  functionName: "balanceOf",
  args: ["0x0000000000000000000000000000000000000001"],
});

// Always read decimals from the contract. Never hardcode them.
const decimals = await getTokenDecimals(token);

// → raw: 12500000n (bigint, raw units)
// → decimals: 6 for pathUSD
// formatTokenAmount(raw, decimals) → "12.5"`,

  create: `const result = addPayment({
  recipient: "Acme Technologies",
  email: "finance@acme.com",
  amount: 800,
  currency: "USDC",
  memo: "Weekly contractor payout",
});

// On success:
// → {
//     ok: true,
//     payment: {
//       id: "PAY-472306",
//       status: "Pending",
//       decision: "allowed",
//       decisionReason: "All policies passed.",
//       date: "2026-10-07T...",
//     },
//     decision: { result: "allowed", reason: "...", evaluated: [...] }
//   }
//
// On block:
// → {
//     ok: false,
//     decision: { result: "blocked", reason: "Daily limit exceeded...", ... }
//   }`,
};

export default function Developers({ policies = [], payments = [] }) {
  const [recipient, setRecipient] = useState("Acme Technologies");
  const [amount, setAmount] = useState("1500");

  const preview = useMemo(() => {
    const numericAmount = Number(amount);
    if (!recipient.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return null;
    }
    return evaluatePayment(
      { recipient: recipient.trim(), amount: numericAmount, memo: "API demo" },
      payments,
      policies
    );
  }, [recipient, amount, payments, policies]);

  return (
    <div className="page-content">
      <div className="page-toolbar">
        <div>
          <h2>Developer interface</h2>
          <p>
            The same primitives the app uses internally, exposed as
            copy-pasteable examples.
          </p>
        </div>
        <span className="demo-label">Live examples</span>
      </div>

      <div className="developer-grid">
        <div className="panel developer-info">
          <div className="developer-icon">
            <Code2 size={20} />
          </div>
          <h3>Build with payment instructions</h3>
          <p>
            Payment OS exposes three core primitives: policy evaluation,
            TIP-20 reads, and payment creation. Each is a plain function —
            no SDK, no server, no API key.
          </p>

          <div className="developer-feature">
            <Check size={15} />
            Deterministic policy evaluation
          </div>
          <div className="developer-feature">
            <Check size={15} />
            Tempo testnet reads and wallet-signed transfers via viem
          </div>
          <div className="developer-feature">
            <Check size={15} />
            Activity log saved in your browser
          </div>
        </div>

        <CodePanel filename="evaluate-payment.js" code={SNIPPETS.evaluate} />
      </div>

      {/* ---------- Live evaluation demo ---------- */}

      <div className="panel developer-tryit">
        <div className="tryit-header">
          <div>
            <h3>Try the policy engine</h3>
            <p>
              Runs <code>evaluatePayment()</code> against the current policies
              and payment history. No payment is created.
            </p>
          </div>
        </div>

        <div className="tryit-form">
          <label>
            Recipient
            <input
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="e.g. Acme Technologies"
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
            />
          </label>
        </div>

        {preview ? (
          <div className={`tryit-result ${preview.result}`}>
            <div className="tryit-result-header">
              <Play size={14} />
              <strong>{decisionLabel(preview.result)}</strong>
            </div>
            <p className="tryit-reason">{preview.reason}</p>
            {preview.evaluated.length > 0 && (
              <ul className="tryit-policies">
                {preview.evaluated.map((item) => (
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
          </div>
        ) : (
          <p className="muted-text">
            Enter a recipient and amount to see a live policy decision.
          </p>
        )}
      </div>

      {/* ---------- More examples ---------- */}

      <div className="developer-grid">
        <CodePanel filename="read-tip20-balance.js" code={SNIPPETS.tip20} />
        <CodePanel filename="create-payment.js" code={SNIPPETS.create} />
      </div>

      {/* ---------- Integration roadmap ---------- */}

      <div className="panel integration-panel">
        <h3>Integration roadmap</h3>

        <div className="roadmap-row">
          <span className="roadmap-number">01</span>
          <div>
            <strong>Local simulation</strong>
            <p>Full payment lifecycle, policy evaluation, and activity log. Runs in the browser and saves payments and activity to local storage.</p>
          </div>
          <span className="roadmap-state done">Current</span>
        </div>

        <div className="roadmap-row">
          <span className="roadmap-number">02</span>
          <div>
            <strong>Tempo testnet — read</strong>
            <p>Live chain ID, block number, latency, and TIP-20 balance reads against Moderato.</p>
          </div>
          <span className="roadmap-state done">Current</span>
        </div>

        <div className="roadmap-row">
          <span className="roadmap-number">03</span>
          <div>
            <strong>Tempo testnet — write</strong>
            <p>Wallet connect, policy-checked TIP-20 transfers with optional memos, signed in your wallet, with on-chain receipt verification.</p>
          </div>
          <span className="roadmap-state done">Current</span>
        </div>

        <div className="roadmap-row">
          <span className="roadmap-number">04</span>
          <div>
            <strong>Authenticated API</strong>
            <p>Server-side validation, access control, and durable audit events.</p>
          </div>
          <span className="roadmap-state">Planned</span>
        </div>
      </div>

      <p className="muted-text" style={{ marginTop: 14 }}>
        These examples call functions that exist in this repository today.
        There is no HTTP API. Anything labeled "Planned" is not
        implemented.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

function CodePanel({ filename, code }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="code-panel">
      <div className="code-panel-header">
        <span>{filename}</span>
        <button className="copy-button" onClick={copy}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}