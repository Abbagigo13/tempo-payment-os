#!/usr/bin/env node
// examples/read-balance.mjs
//
// Run: node examples/read-balance.mjs [address] [token]
//
// Reads a TIP-20 balance from the Tempo Moderato testnet.
// Requires an internet connection. Uses the public RPC, no credentials.

import { publicClient } from "../src/lib/tempo.js";
import { TIP20_ABI, formatTokenAmount } from "../src/lib/tip20.js";

const DEFAULT_ADDRESS = "0x0000000000000000000000000000000000000001";
const DEFAULT_TOKEN = "0x20c0000000000000000000000000000000000000"; // pathUSD

const address = process.argv[2] || DEFAULT_ADDRESS;
const tokenAddress = process.argv[3] || DEFAULT_TOKEN;

if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
  console.error(`Invalid address: ${address}`);
  process.exit(1);
}

console.log(`\nReading ${tokenAddress}`);
console.log(`For     ${address}`);
console.log(`From    https://rpc.moderato.tempo.xyz\n`);

const [raw, decimals, symbol] = await Promise.all([
  publicClient.readContract({
    address: tokenAddress,
    abi: TIP20_ABI,
    functionName: "balanceOf",
    args: [address],
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

console.log(`Symbol:   ${symbol}`);
console.log(`Decimals: ${decimals}`);
console.log(`Raw:      ${raw.toString()}`);
console.log(`Balance:  ${formatTokenAmount(raw, decimals)} ${symbol}\n`);
