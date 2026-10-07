import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export default function StatCard({
  label,
  value,
  change,
  positive = true,
  icon: Icon,
}) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span>{label}</span>
        <div className="stat-icon">
          {Icon && <Icon size={18} />}
        </div>
      </div>

      <div className="stat-value">{value}</div>

      <div className={`stat-change ${positive ? "positive" : "negative"}`}>
        {positive ? (
          <ArrowUpRight size={15} />
        ) : (
          <ArrowDownRight size={15} />
        )}
        <span>{change}</span>
        <span className="change-muted">vs. previous period</span>
      </div>
    </div>
  );
}