import { existsSync, writeFileSync } from "node:fs";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { isAddress } from "viem";

const ownerAddress = process.argv[2];

if (!ownerAddress || !isAddress(ownerAddress)) {
  console.error("Usage: node scripts/setup-wallet.mjs <your MetaMask address>");
  process.exit(1);
}

if (existsSync(".env")) {
  console.error(".env already exists. Not overwriting it.");
  process.exit(1);
}

const key = generatePrivateKey();
const deployer = privateKeyToAccount(key);

const lines = [
  "# Throwaway TESTNET deployer key. Never reuse it anywhere else.",
  `DEPLOYER_PRIVATE_KEY=${key}`,
  "",
  "# Vault roles. These are normal wallet addresses (not secret).",
  `OWNER_ADDRESS=${ownerAddress}`,
  `APPROVER_ADDRESS=${ownerAddress}`,
  "",
  "# pathUSD on Tempo Moderato",
  "TOKEN_ADDRESS=0x20c0000000000000000000000000000000000000",
  "",
  "# Policies, in whole dollars (pathUSD has 6 decimals)",
  "DAILY_LIMIT_USD=5000",
  "APPROVAL_THRESHOLD_USD=1000",
  "",
];

writeFileSync(".env", lines.join("\n"), { encoding: "utf8", flag: "wx" });

console.log("Created contracts/.env (the private key stays inside it).");
console.log("Deployer address (fund this one):", deployer.address);
