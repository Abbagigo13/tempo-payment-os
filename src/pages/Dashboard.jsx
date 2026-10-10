import {
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Wallet,
} from "lucide-react";
import StatCard from "../components/StatCard";
import PaymentTable from "../components/PaymentTable";
import { formatCurrency } from "../lib/formatters";
import NetworkPanel from "../components/NetworkPanel";
import WalletPanel from "../components/WalletPanel";

export default function Dashboard({
  payments,
  onNavigate,
  tempo,
  wallet,
  onSend,
  onCheckPolicy,
}) {
  const completed = payments.filter((p) => p.status === "Completed");
  const pending = payments.filter((p) => p.status === "Pending");
  const volume = completed.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <h2>Payment overview</h2>
          <p>A snapshot of your payment operations.</p>
        </div>
        <span className="demo-label">Sample data</span>
      </div>

      <div className="stats-grid">
        <StatCard
          label="Processed volume"
          value={formatCurrency(volume)}
          change="Demo metric"
          icon={CircleDollarSign}
        />
        <StatCard
          label="Successful payments"
          value={completed.length}
          change="Completed"
          icon={CheckCircle2}
        />
        <StatCard
          label="Pending payments"
          value={pending.length}
          change="Awaiting processing"
          positive={false}
          icon={Clock3}
        />
        <StatCard
          label="Payment records"
          value={payments.length}
          change="All statuses"
          icon={Wallet}
        />
      </div>

      <div className="section-heading">
        <div>
          <h2>Recent payments</h2>
          <p>Latest payment instructions in this demo.</p>
        </div>
        <button
          className="text-button"
          onClick={() => onNavigate("payments")}
        >
          View all <ArrowUpRight size={16} />
        </button>
      </div>

      <div className="panel">
        <PaymentTable payments={payments} limit={5} />
      </div>

      {tempo && (
        <div style={{ marginTop: "18px" }}>
          <NetworkPanel tempo={tempo} />
        </div>
      )}

      {wallet && (
        <div style={{ marginTop: "14px" }}>
          <WalletPanel
            wallet={wallet}
            onSend={onSend}
            onCheckPolicy={onCheckPolicy}
          />
        </div>
      )}

      <div className="bottom-grid">
        <div className="panel insight-panel">
          <div className="panel-title">
            <div className="panel-title-icon">
              <ShieldCheckIcon />
            </div>
            <div>
              <h3>Payment controls</h3>
              <p>Rules help keep payment operations consistent.</p>
            </div>
          </div>
          <button
            className="secondary-button"
            onClick={() => onNavigate("policies")}
          >
            Review policies
          </button>
        </div>

        <div className="panel insight-panel">
          <div className="panel-title">
            <div className="panel-title-icon purple">
              <Clock3 size={19} />
            </div>
            <div>
              <h3>Automate workflows</h3>
              <p>Prepare recurring payment instructions for review.</p>
            </div>
          </div>
          <button
            className="secondary-button"
            onClick={() => onNavigate("automation")}
          >
            Explore automation
          </button>
        </div>
      </div>
    </div>
  );
}

function ShieldCheckIcon() {
  return <CheckCircle2 size={19} />;
}