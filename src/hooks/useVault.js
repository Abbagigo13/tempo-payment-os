import { useCallback, useEffect, useRef, useState } from "react";
import { readVaultState } from "../lib/vault";

export function useVault() {
  const [state, setState] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  // Incremented on every read so a slow older read cannot overwrite a newer one.
  const requestRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestRef.current;
    setStatus("loading");
    setError(null);

    let result;
    try {
      result = await readVaultState();
    } catch (err) {
      if (!mountedRef.current || requestId !== requestRef.current) return;
      setError(err?.shortMessage || err?.message || "Could not read the vault.");
      setStatus("error");
      return;
    }

    if (!mountedRef.current || requestId !== requestRef.current) return;
    setState(result);
    setStatus("ready");
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const timeoutId = setTimeout(() => {
      void refresh();
    }, 0);
    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
    };
  }, [refresh]);

  return { state, status, error, refresh };
}
