import { Bell, Search } from "lucide-react";

const pageTitles = {
  dashboard: ["Overview", "Monitor your payment operations."],
  payments: ["Payments", "Create and track payment instructions."],
  policies: ["Policies", "Manage payment rules and controls."],
  automation: ["Automation", "Review scheduled payment workflows."],
  developers: ["Developers", "Explore the integration interface."],
};

export default function Topbar({ activePage }) {
  const [title, subtitle] = pageTitles[activePage] || pageTitles.dashboard;

  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="topbar-actions">
        <div className="environment-badge">
          <span className="status-dot" />
          Demo environment
        </div>
        <button className="icon-button" aria-label="Search">
          <Search size={18} />
        </button>
        <button className="icon-button" aria-label="Notifications">
          <Bell size={18} />
        </button>
        <div className="avatar">A</div>
      </div>
    </header>
  );
}