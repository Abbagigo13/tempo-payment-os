import { useCallback, useEffect, useRef, useState } from "react";
import { checkTempoConnection, readTokenBalance } from "../lib/tempo";
import { TESTNET_TOKENS, formatTokenAmount, isValidAddress } from "../lib/tip20";

export function useTempoStatus() {
  const [status, setStatus] = useState("idle");
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [balance, setBalance] = useState(null); // { symbol, formatted, address, token }
  const [balanceError, setBalanceError] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const mountedRef = useRef(true);
  // Incremented on every balance read, so a slow older request can't
  // overwrite the result of a newer one.
  const balanceRequestRef = useRef(0);

  const refresh = useCallback(async () => {
    setStatus("connecting");
    setError(null);

    let result;
    try {
      result = await checkTempoConnection();
    } catch (err) {
      result = {
        ok: false,
        error: err?.message || "Unable to reach Tempo RPC.",
      };
    }
    if (!mountedRef.current) return;

    if (result.ok) {
      setInfo({
        blockNumber: result.blockNumber,
        chainId: result.chainId,
        latencyMs: result.latencyMs,
        lastChecked: new Date().toISOString(),
      });
      setStatus("connected");
    } else {
      setError(result.error);
      setStatus("error");
    }
  }, []);

  const checkBalance = useCallback(async (address, tokenKey = "pathUSD") => {
    const requestId = ++balanceRequestRef.current;
    const trimmed = String(address ?? "").trim();

    setBalanceError(null);
    setBalance(null);

    if (!isValidAddress(trimmed)) {
      setBalanceLoading(false);
      setBalanceError("Enter a valid 0x… address.");
      return;
    }

    const tokenAddress = TESTNET_TOKENS[tokenKey];
    if (!tokenAddress) {
      setBalanceLoading(false);
      setBalanceError("Unknown token.");
      return;
    }

    setBalanceLoading(true);

    let result;
    try {
      result = await readTokenBalance(tokenAddress, trimmed);
    } catch (err) {
      result = { ok: false, error: err?.message || "Could not read balance." };
    }

    // Ignore the result if the page was left or a newer read has started.
    if (!mountedRef.current || requestId !== balanceRequestRef.current) return;
    setBalanceLoading(false);

    if (!result.ok) {
      setBalanceError(result.error);
      return;
    }

    setBalance({
      address: trimmed,
      token: tokenKey,
      symbol: result.symbol,
      formatted: formatTokenAmount(result.raw, result.decimals),
    });
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

  return {
    status,
    info,
    error,
    refresh,
    balance,
    balanceError,
    balanceLoading,
    checkBalance,
  };
}