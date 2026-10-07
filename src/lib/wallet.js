// src/lib/wallet.js
import { createWalletClient, custom } from "viem";
import { tempoTestnet } from "./tempo";
import { TIP20_ABI } from "./tip20Abi";
import { parseTokenAmount, getTokenDecimals } from "./tip20";

const CHAIN_HEX = "0x" + tempoTestnet.id.toString(16);

const CHAIN_PARAMS = {
  chainId: CHAIN_HEX,
  chainName: tempoTestnet.name,
  nativeCurrency: tempoTestnet.nativeCurrency,
  rpcUrls: tempoTestnet.rpcUrls.default.http,
  blockExplorerUrls: [tempoTestnet.blockExplorers.default.url],
};

export function discoverProviders(onFound) {
  function handleAnnounce(event) {
    onFound(event.detail);
  }
  window.addEventListener("eip6963:announceProvider", handleAnnounce);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  return () => {
    window.removeEventListener("eip6963:announceProvider", handleAnnounce);
  };
}

export async function connectWithProvider(provider) {
  if (!provider) throw new Error("No wallet provider selected.");
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!accounts || accounts.length === 0) {
    throw new Error("Wallet returned no accounts.");
  }
  return accounts[0];
}

export async function getChainIdFromProvider(provider) {
  if (!provider) return null;
  const hex = await provider.request({ method: "eth_chainId" });
  return Number(BigInt(hex));
}

export async function switchProviderToTempo(provider) {
  if (!provider) throw new Error("No wallet provider.");
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_HEX }],
    });
  } catch (error) {
    if (error?.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [CHAIN_PARAMS],
      });
      return;
    }
    throw error;
  }
}

/**
 * Send a TIP-20 transfer using the given provider.
 * Reads `decimals` from the token contract — never hardcode it.
 */
export async function sendTip20Transfer({
  provider,
  from,
  to,
  tokenAddress,
  amount,
}) {
  if (!provider) {
    return { ok: false, error: "No wallet provider." };
  }

  let decimals;
  try {
    decimals = await getTokenDecimals(tokenAddress);
  } catch {
    return { ok: false, error: "Could not read token decimals." };
  }

  let rawAmount;
  try {
    rawAmount = parseTokenAmount(amount, decimals);
  } catch (error) {
    return { ok: false, error: error.message };
  }

  console.log("[tip20] SENDING", {
    token: tokenAddress,
    recipient: to,
    inputAmount: amount,
    rawAmount: rawAmount.toString(),
    decimals,
  });

  try {
    const walletClient = createWalletClient({
      chain: tempoTestnet,
      transport: custom(provider),
    });

    const hash = await walletClient.writeContract({
      account: from,
      address: tokenAddress,
      abi: TIP20_ABI,
      functionName: "transfer",
      args: [to, rawAmount],
      gas: 300000n,
    });

    return { ok: true, hash };
  } catch (error) {
    return {
      ok: false,
      error: error?.shortMessage || error?.message || "Transaction rejected.",
    };
  }
}