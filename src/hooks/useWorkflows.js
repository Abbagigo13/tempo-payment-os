import { useEffect, useState } from "react";
import { workflows as initialWorkflows } from "../data/demoData";
import { loadStored, saveStored } from "../lib/storage";

// Bump the version if the saved format ever changes.
const STORAGE_KEY = "workflows:v1";

// Saved format: { "1": { status, lastRun, lastRunResult }, ... }
function isValidState(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => v && typeof v === "object")
  );
}

// Take the workflow definitions from code and apply the saved state.
function applySaved(saved) {
  return initialWorkflows.map((w) => {
    const s = saved[w.id];
    if (!s) return w;
    return {
      ...w,
      status:
        s.status === "Active" || s.status === "Paused" ? s.status : w.status,
      lastRun: typeof s.lastRun === "string" ? s.lastRun : w.lastRun,
      lastRunResult:
        s.lastRunResult && typeof s.lastRunResult === "object"
          ? s.lastRunResult
          : w.lastRunResult,
    };
  });
}

export function useWorkflows() {
  const [workflows, setWorkflows] = useState(() =>
    applySaved(loadStored(STORAGE_KEY, {}, isValidState))
  );

  // Save each workflow's status and last run whenever they change.
  useEffect(() => {
    const state = {};
    for (const w of workflows) {
      state[w.id] = {
        status: w.status,
        lastRun: w.lastRun,
        lastRunResult: w.lastRunResult,
      };
    }
    saveStored(STORAGE_KEY, state);
  }, [workflows]);

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