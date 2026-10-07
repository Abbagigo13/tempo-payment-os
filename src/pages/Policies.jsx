import { ShieldCheck, AlertTriangle } from "lucide-react";
import PolicyCard from "../components/PolicyCard";

export default function Policies({ policies, togglePolicy }) {
  const enabledCount = policies.filter((policy) => policy.enabled).length;

  return (
    <div className="page-content">
      <div className="page-toolbar">
        <div>
          <h2>Payment policies</h2>
          <p>Configure example controls for payment operations.</p>
        </div>
        <div className="policy-count">
          <ShieldCheck size={17} />
          {enabledCount} of {policies.length} enabled
        </div>
      </div>

      <div className="notice-panel">
        <AlertTriangle size={18} />
        <p>
          These rules are UI demonstrations only. They do not enforce
          on-chain restrictions or protect real funds.
        </p>
      </div>

      <div className="policy-list">
        {policies.map((policy) => (
          <PolicyCard
            key={policy.id}
            policy={policy}
            onToggle={togglePolicy}
          />
        ))}
      </div>
    </div>
  );
}