// src/lib/tip20.js
//
// Minimal TIP-20 ABI + token helpers.
// TIP-20 spec: https://docs.tempo.xyz

import { publicClient } from "./tempo";
import { TIP20_ABI } from "./tip20Abi";

export { TIP20_ABI };

// Known testnet stablecoin addresses.
// pathUSD at 0x20c0...0000 is verified live on Moderato.
export const TESTNET_TOKENS = {
  pathUSD: "0x20c0000000000000000000000000000000000000",
  alphaUSD: "0x20c0000000000000000000000000000000000001",
  betaUSD: "0x20c0000000000000000000000000000000000002",
  thetaUSD: "0x20c0000000000000000000000000000000000003",
};

/**
 * Format a raw token balance (bigint) into a human-readable string.
 */
export function formatTokenAmount(raw, decimals) {
  if (raw === undefined || raw === null) return "—";
  const divisor = 10n ** BigInt(decimals);
  const whole = raw / divisor;
  const fraction = raw % divisor;
  if (fraction === 0n) return whole.toString();
  const padded = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole}.${padded}`;
}

/**
 * Parse a user-entered decimal amount into raw token units (bigint).
 */
export function parseTokenAmount(input, decimals) {
  const value = String(input).trim();
  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error("Amount must be a positive decimal number.");
  }
  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > decimals) {
    throw new Error(`Too many decimal places (max ${decimals}).`);
  }
  const padded = fraction.padEnd(decimals, "0");
  return BigInt(whole + padded);
}

export function isValidAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

/**
 * Read a token's `decimals` from the contract. Cached per session.
 * PathUSD on Tempo uses 6 decimals — never hardcode this.
 */
const decimalsCache = new Map();

export async function getTokenDecimals(tokenAddress) {
  const key = tokenAddress.toLowerCase();
  if (decimalsCache.has(key)) return decimalsCache.get(key);

  const decimals = await publicClient.readContract({
    address: tokenAddress,
    abi: TIP20_ABI,
    functionName: "decimals",
  });

  const value = Number(decimals);
  decimalsCache.set(key, value);
  return value;
}