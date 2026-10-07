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

export default function Sidebar({ activePage, setActivePage }) {
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
          <span className="status-dot" />
          <div>
            <strong>Local simulation</strong>
            <small>No blockchain connection</small>
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