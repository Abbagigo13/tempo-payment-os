import { useState } from "react";
import { workflows as initialWorkflows } from "../data/demoData";

export function useWorkflows() {
  const [workflows, setWorkflows] = useState(initialWorkflows);

  function toggleWorkflow(id) {
    setWorkflows((current) =>
      current.map((w) =>
        w.id === id
          ? {
              ...w,
              status: w.status === "Active" ? "Paused" : "Active",
            }
          : w
      )
    );
  }

  function markRun(id, result) {
    setWorkflows((current) =>
      current.map((w) =>
        w.id === id
          ? {
              ...w,
              lastRun: new Date().toISOString(),
              lastRunResult: result,
            }
          : w
      )
    );
  }

  return { workflows, toggleWorkflow, markRun };
}