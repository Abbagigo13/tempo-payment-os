import { useEffect, useState } from "react";
import { initialPolicies } from "../data/demoData";
import { loadStored, saveStored } from "../lib/storage";

// Bump the version if the saved format ever changes.
const STORAGE_KEY = "policies:v1";

// Saved format: { "1": true, "2": false, ... } (policy id → enabled)
function isValidSettings(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => typeof v === "boolean")
  );
}

// Take the policy definitions from code and apply the saved on/off values.
function applySaved(saved) {
  return initialPolicies.map((p) =>
    typeof saved[p.id] === "boolean" ? { ...p, enabled: saved[p.id] } : p
  );
}

export function usePolicies() {
  const [policies, setPolicies] = useState(() =>
    applySaved(loadStored(STORAGE_KEY, {}, isValidSettings))
  );

  // Save the on/off settings whenever they change.
  useEffect(() => {
    const settings = {};
    for (const p of policies) settings[p.id] = p.enabled;
    saveStored(STORAGE_KEY, settings);
  }, [policies]);

  function togglePolicy(id) {
    setPolicies((current) =>
      current.map((p) =>
        p.id === id ? { ...p, enabled: !p.enabled } : p
      )
    );
  }

  return { policies, togglePolicy };
}