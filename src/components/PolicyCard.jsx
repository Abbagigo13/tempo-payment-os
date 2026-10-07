import { ShieldCheck, ToggleLeft, ToggleRight } from "lucide-react";

export default function PolicyCard({ policy, onToggle }) {
  return (
    <div className="policy-card">
      <div className="policy-icon">
        <ShieldCheck size={20} />
      </div>

      <div className="policy-content">
        <div className="policy-heading">
          <h3>{policy.name}</h3>
          <span className="policy-type">{policy.type}</span>
        </div>
        <p>{policy.description}</p>
      </div>

      <button
        className={`toggle-button ${policy.enabled ? "enabled" : ""}`}
        onClick={() => onToggle(policy.id)}
        aria-label={`Toggle ${policy.name}`}
      >
        {policy.enabled ? (
          <ToggleRight size={29} />
        ) : (
          <ToggleLeft size={29} />
        )}
      </button>
    </div>
  );
}