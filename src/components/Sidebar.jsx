import {
  Activity,
  ArrowLeftRight,
  Blocks,
  Bot,
  LayoutDashboard,
  ShieldCheck,
  Wallet,
} from "lucide-react";

const navItems = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "payments", label: "Payments", icon: ArrowLeftRight },
  { id: "policies", label: "Policies", icon: ShieldCheck },
  { id: "automation", label: "Automation", icon: Bot },
  { id: "developers", label: "Developers", icon: Blocks },
];

const DOT_COLORS = {
  connected: "#3ecf8e",
  checking: "#f5a524",
  error: "#f31260",
};

// What the badge at the bottom of the sidebar says, based on the
// live status of the Tempo RPC connection.
function describeNetwork(status) {
  if (status === "connected") {
    return { title: "Tempo testnet", detail: "Connected", tone: "connected" };
  }
  if (status === "error") {
    return {
      title: "Tempo unreachable",
      detail: "Simulation mode still works",
      tone: "error",
    };
  }
  return { title: "Tempo testnet", detail: "Checking...", tone: "checking" };
}

export default function Sidebar({ activePage, setActivePage, tempo }) {
  const network = describeNetwork(tempo?.status);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <Wallet size={21} />
        </div>
        <div>
          <strong>Tempo OS</strong>
          <span>Payment control plane</span>
        </div>
      </div>

      <div className="workspace-label">WORKSPACE</div>

      <nav className="sidebar-nav">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav-item ${activePage === id ? "active" : ""}`}
            onClick={() => setActivePage(id)}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="network-status">
          <span
            className="status-dot"
            style={{ background: DOT_COLORS[network.tone] }}
          />
          <div>
            <strong>{network.title}</strong>
            <small>{network.detail}</small>
          </div>
        </div>
        <div className="sidebar-footer">
          <Activity size={15} />
          <span>Tempo Payment OS</span>
          <span className="version">v0.1</span>
        </div>
      </div>
    </aside>
  );
}
