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

  const refresh = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    const result = await checkTempoConnection();
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
    setBalanceError(null);
    setBalance(null);

    if (!isValidAddress(address)) {
      setBalanceError("Enter a valid 0x… address.");
      return;
    }

    const tokenAddress = TESTNET_TOKENS[tokenKey];
    if (!tokenAddress) {
      setBalanceError("Unknown token.");
      return;
    }

    setBalanceLoading(true);
    const result = await readTokenBalance(tokenAddress, address.trim());
    if (!mountedRef.current) return;
    setBalanceLoading(false);

    if (!result.ok) {
      setBalanceError(result.error);
      return;
    }

    setBalance({
      address: address.trim(),
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