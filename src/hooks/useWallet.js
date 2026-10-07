import { useCallback, useEffect, useState } from "react";
import {
  connectWithProvider,
  discoverProviders,
  getChainIdFromProvider,
  switchProviderToTempo,
} from "../lib/wallet";
import { tempoTestnet } from "../lib/tempo";

export function useWallet() {
  const [providers, setProviders] = useState([]);
  const [selected, setSelected] = useState(null); // { info, provider }
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [status, setStatus] = useState("disconnected");
  const [error, setError] = useState(null);

  const isOnCorrectChain = chainId === tempoTestnet.id;

  // EIP-6963 discovery — runs once on mount.
  useEffect(() => {
    const unsubscribe = discoverProviders((detail) => {
      setProviders((prev) => {
        if (prev.find((p) => p.info.uuid === detail.info.uuid)) return prev;
        return [...prev, detail];
      });
    });
    return unsubscribe;
  }, []);

  const activeSelected = selected ?? (providers.length === 1 ? providers[0] : null);

  const connect = useCallback(async (chosenProvider) => {
    const target = chosenProvider || activeSelected;
    if (!target) {
      setError("Choose a wallet first.");
      return;
    }
    setError(null);
    setStatus("connecting");

    try {
      const account = await connectWithProvider(target.provider);
      const currentChain = await getChainIdFromProvider(target.provider);

      setSelected(target);
      setAddress(account);
      setChainId(currentChain);
      setStatus("connected");

      if (currentChain !== tempoTestnet.id) {
        try {
          await switchProviderToTempo(target.provider);
          setChainId(tempoTestnet.id);
        } catch {
          // Silent — user may decline. Panel offers a manual switch.
        }
      }
    } catch (err) {
      setError(err?.message || "Failed to connect wallet.");
      setStatus("error");
    }
  }, [activeSelected]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setStatus("disconnected");
    setError(null);
    // Keep `selected` so reconnecting is one click.
  }, []);

  const switchChain = useCallback(async () => {
    if (!selected?.provider) return;
    setError(null);
    try {
      await switchProviderToTempo(selected.provider);
      setChainId(tempoTestnet.id);
    } catch (err) {
      setError(err?.message || "Failed to switch chain.");
    }
  }, [selected]);

  // Listen for wallet events on the selected provider only.
  useEffect(() => {
    const provider = selected?.provider;
    if (!provider) return;

    function handleAccountsChanged(accounts) {
      if (!accounts || accounts.length === 0) {
        disconnect();
      } else {
        setAddress(accounts[0]);
      }
    }

    function handleChainChanged(hex) {
      setChainId(Number(BigInt(hex)));
    }

    provider.on?.("accountsChanged", handleAccountsChanged);
    provider.on?.("chainChanged", handleChainChanged);

    return () => {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [selected, disconnect]);

  return {
    providers,
    selected,
    status,
    address,
    chainId,
    isOnCorrectChain,
    error,
    connect,
    disconnect,
    switchChain,
  };
}