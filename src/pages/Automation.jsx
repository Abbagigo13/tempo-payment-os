import { CalendarClock, Pause, Play, PlayCircle, Workflow } from "lucide-react";
import { formatDate } from "../lib/formatters";

const OUTCOME_BADGE = {
  allowed: { className: "completed", label: "Payment created" },
  approval: { className: "pending", label: "Created, approval required" },
  blocked: { className: "failed", label: "Blocked by policy" },
};

export default function Automation({
  workflows,
  toggleWorkflow,
  runWorkflow,
  markRun,
}) {
  function handleRun(workflow) {
    const outcome = runWorkflow(workflow);
    markRun(workflow.id, outcome);
  }

  return (
    <div className="page-content">
      <div className="page-toolbar">
        <div>
          <h2>Payment workflows</h2>
          <p>Explore recurring and scheduled payment examples.</p>
        </div>
        <span className="demo-label">Preview</span>
      </div>

      <div className="automation-intro panel">
        <div className="automation-symbol">
          <Workflow size={23} />
        </div>
        <div>
          <h3>From payment rules to repeatable operations</h3>
          <p>
            A future workflow engine could prepare payments on a schedule,
            check policies, and route them for approval before execution.
          </p>
        </div>
      </div>

      <div className="workflow-list">
        {workflows.map((workflow) => {
          const isActive = workflow.status === "Active";
          const lastRun = workflow.lastRunResult;
          const badge = lastRun ? OUTCOME_BADGE[lastRun.outcome] : null;

          return (
            <div className="workflow-card" key={workflow.id}>
              <div className="workflow-icon">
                <CalendarClock size={20} />
              </div>
              <div className="workflow-info">
                <h3>{workflow.name}</h3>
                <p>{workflow.description}</p>
                <span className="workflow-schedule">{workflow.schedule}</span>

                {lastRun && badge && (
                  <p className="muted-text">
                    Last run {formatDate(workflow.lastRun)}:{" "}
                    <span className={`status-badge ${badge.className}`}>
                      <span className="status-dot" />
                      {badge.label}
                    </span>
                    {lastRun.message ? ` ${lastRun.message}` : ""}
                  </p>
                )}
              </div>
              <div className="workflow-controls">
                <span
                  className={`status-badge ${
                    isActive ? "completed" : "pending"
                  }`}
                >
                  <span className="status-dot" />
                  {workflow.status}
                </span>
                <button
                  className="secondary-button small"
                  onClick={() => toggleWorkflow(workflow.id)}
                >
                  {isActive ? (
                    <>
                      <Pause size={14} /> Pause
                    </>
                  ) : (
                    <>
                      <Play size={14} /> Activate
                    </>
                  )}
                </button>
                <button
                  className="secondary-button small"
                  onClick={() => handleRun(workflow)}
                  disabled={!isActive}
                  title={
                    isActive
                      ? "Create a payment from this workflow now"
                      : "Activate the workflow to run it"
                  }
                >
                  <PlayCircle size={14} /> Run now
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="muted-text automation-footnote">
        "Run now" sends the workflow's payment through the policy engine and
        adds it to Payments as Pending. Nothing is scheduled or executed
        on-chain.
      </p>
    </div>
  );
}