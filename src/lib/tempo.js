// src/lib/tempo.js
import { createPublicClient, http, defineChain } from "viem";
import { TIP20_ABI } from "./tip20Abi";

// Tempo Moderato testnet — see https://docs.tempo.xyz
export const tempoTestnet = defineChain({
  id: 42431,
  name: "Tempo Testnet (Moderato)",
  nativeCurrency: { name: "USD", symbol: "USD", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.moderato.tempo.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "Tempo Testnet Explorer",
      url: "https://explore.testnet.tempo.xyz",
    },
  },
  testnet: true,
});

export const publicClient = createPublicClient({
  chain: tempoTestnet,
  transport: http(),
});

export async function checkTempoConnection() {
  const start = performance.now();
  try {
    const [blockNumber, chainId] = await Promise.all([
      publicClient.getBlockNumber(),
      publicClient.getChainId(),
    ]);
    const latencyMs = Math.round(performance.now() - start);
    return {
      ok: true,
      blockNumber: Number(blockNumber),
      chainId,
      latencyMs,
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.shortMessage || error?.message || "RPC request failed",
    };
  }
}

export async function readTokenBalance(tokenAddress, holderAddress) {
  try {
    const [raw, decimals, symbol] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress,
        abi: TIP20_ABI,
        functionName: "balanceOf",
        args: [holderAddress],
      }),
      publicClient.readContract({
        address: tokenAddress,
        abi: TIP20_ABI,
        functionName: "decimals",
      }),
      publicClient.readContract({
        address: tokenAddress,
        abi: TIP20_ABI,
        functionName: "symbol",
      }),
    ]);

    return { ok: true, raw, decimals, symbol };
  } catch (error) {
    return {
      ok: false,
      error: error?.shortMessage || error?.message || "Read failed",
    };
  }
}