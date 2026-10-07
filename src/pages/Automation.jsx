import { useState } from "react";
import { CalendarClock, Pause, Play, Workflow } from "lucide-react";
import { workflows as initialWorkflows } from "../data/demoData";

export default function Automation() {
  const [workflows, setWorkflows] = useState(initialWorkflows);

  function toggleWorkflow(id) {
    setWorkflows((current) =>
      current.map((workflow) =>
        workflow.id === id
          ? {
              ...workflow,
              status: workflow.status === "Active" ? "Paused" : "Active",
            }
          : workflow
      )
    );
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
        {workflows.map((workflow) => (
          <div className="workflow-card" key={workflow.id}>
            <div className="workflow-icon">
              <CalendarClock size={20} />
            </div>
            <div className="workflow-info">
              <h3>{workflow.name}</h3>
              <p>{workflow.description}</p>
              <span className="workflow-schedule">{workflow.schedule}</span>
            </div>
            <div className="workflow-controls">
              <span
                className={`status-badge ${
                  workflow.status === "Active" ? "completed" : "pending"
                }`}
              >
                <span className="status-dot" />
                {workflow.status}
              </span>
              <button
                className="secondary-button small"
                onClick={() => toggleWorkflow(workflow.id)}
              >
                {workflow.status === "Active" ? (
                  <><Pause size={14} /> Pause</>
                ) : (
                  <><Play size={14} /> Activate</>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="muted-text automation-footnote">
        Workflow toggles only change local demo state. No scheduled payments
        are created or executed.
      </p>
    </div>
  );
}