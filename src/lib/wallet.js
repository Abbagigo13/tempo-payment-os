// src/lib/wallet.js
import { createWalletClient, custom, isAddress, stringToHex } from "viem";
import { tempoTestnet, publicClient } from "./tempo.js";
import { TIP20_ABI } from "./tip20Abi.js";
import { parseTokenAmount, getTokenDecimals } from "./tip20.js";

const CHAIN_HEX = "0x" + tempoTestnet.id.toString(16);

const CHAIN_PARAMS = {
  chainId: CHAIN_HEX,
  chainName: tempoTestnet.name,
  nativeCurrency: tempoTestnet.nativeCurrency,
  rpcUrls: tempoTestnet.rpcUrls.default.http,
  blockExplorerUrls: [tempoTestnet.blockExplorers.default.url],
};

// How long to wait for the transaction to be confirmed on-chain.
const RECEIPT_TIMEOUT_MS = 60_000;

// TIP-20 memos are exactly 32 bytes.
export const MEMO_MAX_BYTES = 32;

/**
 * Convert memo text into a 32-byte hex value (padded on the right),
 * or return an error if it does not fit.
 * An empty memo returns { ok: true, hex: null }.
 */
export function encodeMemo(memo) {
  const text = String(memo ?? "").trim();
  if (!text) return { ok: true, hex: null };

  // Count bytes, not characters: non-English letters and emoji
  // take more than one byte each.
  const byteLength = new TextEncoder().encode(text).length;
  if (byteLength > MEMO_MAX_BYTES) {
    return {
      ok: false,
      error: `Memo is too long (${byteLength} bytes). The limit is ${MEMO_MAX_BYTES} bytes.`,
    };
  }

  return { ok: true, hex: stringToHex(text, { size: MEMO_MAX_BYTES }) };
}

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
 * If `memo` is given, uses transferWithMemo; otherwise plain transfer.
 *
 * Returns:
 *   { ok: true, hash, confirmed: true }   confirmed on-chain
 *   { ok: true, hash, confirmed: false }  submitted, but not confirmed
 *                                         within the timeout
 *   { ok: false, error, hash? }           failed (hash is set if the
 *                                         transaction reverted on-chain)
 */
export async function sendTip20Transfer({
  provider,
  from,
  to,
  tokenAddress,
  amount,
  memo,
}) {
  if (!provider) {
    return { ok: false, error: "No wallet provider." };
  }

  if (!isAddress(from)) {
    return { ok: false, error: "Sender address is invalid." };
  }
  if (!isAddress(to)) {
    return { ok: false, error: "Recipient address is invalid." };
  }
  if (!isAddress(tokenAddress)) {
    return { ok: false, error: "Token address is invalid." };
  }

  const encodedMemo = encodeMemo(memo);
  if (!encodedMemo.ok) {
    return { ok: false, error: encodedMemo.error };
  }

  let chainId;
  try {
    chainId = await getChainIdFromProvider(provider);
  } catch {
    return { ok: false, error: "Could not read the wallet's network." };
  }
  if (chainId !== tempoTestnet.id) {
    return {
      ok: false,
      error: `Wallet is on the wrong network. Switch to ${tempoTestnet.name} (chain ID ${tempoTestnet.id}).`,
    };
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

  if (rawAmount <= 0n) {
    return { ok: false, error: "Amount must be greater than zero." };
  }

  console.log("[tip20] SENDING", {
    token: tokenAddress,
    recipient: to,
    inputAmount: amount,
    rawAmount: rawAmount.toString(),
    decimals,
    memo: encodedMemo.hex ? String(memo).trim() : null,
  });

  let hash;
  try {
    const walletClient = createWalletClient({
      chain: tempoTestnet,
      transport: custom(provider),
    });

    if (encodedMemo.hex) {
      hash = await walletClient.writeContract({
        account: from,
        address: tokenAddress,
        abi: TIP20_ABI,
        functionName: "transferWithMemo",
        args: [to, rawAmount, encodedMemo.hex],
        gas: 300000n,
      });
    } else {
      hash = await walletClient.writeContract({
        account: from,
        address: tokenAddress,
        abi: TIP20_ABI,
        functionName: "transfer",
        args: [to, rawAmount],
        gas: 300000n,
      });
    }
  } catch (error) {
    return {
      ok: false,
      error: error?.shortMessage || error?.message || "Transaction rejected.",
    };
  }

  // The wallet has submitted the transaction. Wait for it to be mined
  // and check that it actually succeeded.
  let receipt;
  try {
    receipt = await publicClient.waitForTransactionReceipt({
      hash,
      timeout: RECEIPT_TIMEOUT_MS,
    });
  } catch {
    // Timed out or the RPC failed. The transaction may still confirm
    // later, so report it as submitted but not yet confirmed.
    return { ok: true, hash, confirmed: false };
  }

  if (receipt.status !== "success") {
    return {
      ok: false,
      hash,
      error: "Transaction was submitted but reverted on-chain.",
    };
  }

  return { ok: true, hash, confirmed: true };
}