import "dotenv/config";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  encodeDeployData,
  parseUnits,
  formatUnits,
  isAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const SEND = process.argv.includes("--send");
const MAX_TX_GAS = 30_000_000n; // Tempo's per-transaction cap

const chain = defineChain({
  id: 42431,
  name: "Tempo Moderato",
  nativeCurrency: { name: "USD", symbol: "USD", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.moderato.tempo.xyz"] } },
  blockExplorers: {
    default: { name: "Tempo Explorer", url: "https://explore.testnet.tempo.xyz" },
  },
});

const TOKEN_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
];

function fail(message) {
  console.error("ERROR: " + message);
  process.exit(1);
}

function need(name) {
  const value = process.env[name];
  if (!value || !value.trim()) fail("Missing " + name + " in contracts/.env");
  return value.trim();
}

function needAddress(name) {
  const value = need(name);
  if (!isAddress(value)) fail(name + " is not a valid address");
  return value;
}

const key = need("DEPLOYER_PRIVATE_KEY");
if (!/^0x[0-9a-fA-F]{64}$/.test(key)) fail("DEPLOYER_PRIVATE_KEY is not a valid key");
const account = privateKeyToAccount(key);

const tokenAddress = needAddress("TOKEN_ADDRESS");
const ownerAddress = needAddress("OWNER_ADDRESS");
const approverAddress = needAddress("APPROVER_ADDRESS");

const publicClient = createPublicClient({ chain, transport: http() });

const chainId = await publicClient.getChainId();
if (chainId !== 42431) fail("RPC reports chain " + chainId + ", expected 42431. Stopping.");

// Read decimals and symbol from the token. Never hardcode them.
const decimals = await publicClient.readContract({
  address: tokenAddress,
  abi: TOKEN_ABI,
  functionName: "decimals",
});
const symbol = await publicClient.readContract({
  address: tokenAddress,
  abi: TOKEN_ABI,
  functionName: "symbol",
});

const dailyLimit = parseUnits(need("DAILY_LIMIT_USD"), decimals);
const approvalThreshold = parseUnits(need("APPROVAL_THRESHOLD_USD"), decimals);

const deployerBalance = await publicClient.readContract({
  address: tokenAddress,
  abi: TOKEN_ABI,
  functionName: "balanceOf",
  args: [account.address],
});

const artifact = JSON.parse(
  readFileSync(new URL("../artifacts/src/PolicyVault.sol/PolicyVault.json", import.meta.url), "utf8")
);
const abi = artifact.abi;
const bytecode = artifact.bytecode;
const sizeBytes = (bytecode.length - 2) / 2;

const args = [tokenAddress, ownerAddress, approverAddress, dailyLimit, approvalThreshold];

let gasEstimate = null;
try {
  gasEstimate = await publicClient.estimateGas({
    account: account.address,
    data: encodeDeployData({ abi, bytecode, args }),
  });
} catch (error) {
  console.log("Could not estimate gas: " + (error.shortMessage || error.message));
}

console.log("");
console.log("PolicyVault deployment " + (SEND ? "(SENDING)" : "(dry run, nothing is sent)"));
console.log("------------------------------------------------------------");
console.log("Network:            " + chain.name + " (chain " + chainId + ")");
console.log("Deployer:           " + account.address);
console.log("Deployer balance:   " + formatUnits(deployerBalance, decimals) + " " + symbol);
console.log("Token:              " + tokenAddress + " (" + symbol + ", " + decimals + " decimals)");
console.log("Owner:              " + ownerAddress);
console.log("Approver:           " + approverAddress);
console.log("Daily limit:        " + formatUnits(dailyLimit, decimals) + " " + symbol);
console.log("Approval threshold: " + formatUnits(approvalThreshold, decimals) + " " + symbol);
console.log("Contract size:      " + sizeBytes + " bytes");
console.log("Estimated gas:      " + (gasEstimate === null ? "unknown" : gasEstimate.toString()));
console.log("------------------------------------------------------------");

if (!SEND) {
  console.log("Dry run only. To deploy for real, run:");
  console.log("  node scripts/deploy.mjs --send");
  process.exit(0);
}

if (deployerBalance === 0n) fail("The deployer holds no " + symbol + ". Fund it from the faucet first.");
if (gasEstimate === null) fail("No gas estimate, so not sending.");

const gas = (gasEstimate * 130n) / 100n; // 30% safety margin
if (gas > MAX_TX_GAS) fail("Gas " + gas + " is over the per-transaction cap " + MAX_TX_GAS + ".");

const walletClient = createWalletClient({ account, chain, transport: http() });

console.log("Sending with an explicit gas limit of " + gas + " ...");
const hash = await walletClient.deployContract({ abi, bytecode, args, gas });
console.log("Submitted: " + hash);

const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
if (receipt.status !== "success") {
  fail("Deployment transaction reverted: " + chain.blockExplorers.default.url + "/tx/" + hash);
}

const address = receipt.contractAddress;
console.log("Deployed at: " + address);
console.log("Explorer:    " + chain.blockExplorers.default.url + "/address/" + address);

// Read the settings back from the live contract.
const read = (functionName) =>
  publicClient.readContract({ address, abi, functionName });
const live = {
  owner: await read("owner"),
  approver: await read("approver"),
  dailyLimit: (await read("dailyLimit")).toString(),
  approvalThreshold: (await read("approvalThreshold")).toString(),
};
console.log("Read back from the contract:", live);

mkdirSync("deployments", { recursive: true });
writeFileSync(
  "deployments/moderato.json",
  JSON.stringify(
    {
      network: chain.name,
      chainId,
      address,
      token: tokenAddress,
      deployTx: hash,
      blockNumber: receipt.blockNumber.toString(),
      ...live,
    },
    null,
    2
  )
);
console.log("Saved deployments/moderato.json");
