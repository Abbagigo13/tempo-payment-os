import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Dashboard from "./pages/Dashboard";
import Payments from "./pages/Payments";
import Policies from "./pages/Policies";
import Automation from "./pages/Automation";
import Developers from "./pages/Developers";
import { usePayments } from "./hooks/usePayments";
import { usePolicies } from "./hooks/usePolicies";
import { useActivity } from "./hooks/useActivity";
import { useWorkflows } from "./hooks/useWorkflows";
import { useTempoStatus } from "./hooks/useTempoStatus";
import { useWallet } from "./hooks/useWallet";
import { sendTip20Transfer } from "./lib/wallet";

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");

  const { policies, togglePolicy } = usePolicies();
  const activity = useActivity();
  const { payments, addPayment, runWorkflow, simulatePayment } = usePayments(
    policies,
    activity
  );
  const { workflows, toggleWorkflow, markRun } = useWorkflows();
  const tempo = useTempoStatus();
  const wallet = useWallet();

  function renderPage() {
    switch (activePage) {
      case "payments":
        return (
          <Payments
            payments={payments}
            policies={policies}
            addPayment={addPayment}
            simulatePayment={simulatePayment}
            activity={activity}
          />
        );

      case "policies":
        return <Policies policies={policies} togglePolicy={togglePolicy} />;

      case "automation":
        return (
          <Automation
            workflows={workflows}
            toggleWorkflow={toggleWorkflow}
            runWorkflow={runWorkflow}
            markRun={markRun}
            onNavigate={setActivePage}
          />
        );

      case "developers":
        return <Developers policies={policies} payments={payments} />;

      default:
        return (
          <Dashboard
            payments={payments}
            onNavigate={setActivePage}
            tempo={tempo}
            wallet={wallet}
            onSend={sendTip20Transfer}
          />
        );
    }
  }

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <main className="main-area">
        <Topbar activePage={activePage} />
        {renderPage()}
      </main>
    </div>
  );
}