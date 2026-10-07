import { useState } from "react";
import { initialPolicies } from "../data/demoData";

export function usePolicies() {
  const [policies, setPolicies] = useState(initialPolicies);

  function togglePolicy(id) {
    setPolicies((current) =>
      current.map((p) =>
        p.id === id ? { ...p, enabled: !p.enabled } : p
      )
    );
  }

  return { policies, togglePolicy };
}