import { readFileSync } from "node:fs";
import { createPublicClient, http, defineChain, formatUnits } from "viem";

const chain = defineChain({
  id: 42431,
  name: "Tempo Moderato",
  nativeCurrency: { name: "USD", symbol: "USD", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.moderato.tempo.xyz"] } },
});

const deployment = JSON.parse(
  readFileSync(new URL("../deployments/moderato.json", import.meta.url), "utf8")
);
const artifact = JSON.parse(
  readFileSync(
    new URL("../artifacts/src/PolicyVault.sol/PolicyVault.json", import.meta.url),
    "utf8"
  )
);

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

const client = createPublicClient({ chain, transport: http() });
const vault = deployment.address;
const readVault = (functionName) =>
  client.readContract({ address: vault, abi: artifact.abi, functionName });
const readToken = (functionName, args = []) =>
  client.readContract({ address: deployment.token, abi: TOKEN_ABI, functionName, args });

const decimals = await readToken("decimals");
const symbol = await readToken("symbol");
const money = (raw) => formatUnits(raw, decimals) + " " + symbol;

console.log("");
console.log("PolicyVault status");
console.log("------------------------------------------------------------");
console.log("Vault:               " + vault);
console.log("Token balance:       " + money(await readToken("balanceOf", [vault])));
console.log("Daily limit:         " + money(await readVault("dailyLimit")));
console.log("Approval threshold:  " + money(await readVault("approvalThreshold")));
console.log("Remaining today:     " + money(await readVault("remainingToday")));
console.log("Known-recipient rule: " + (await readVault("requireKnownRecipient")));
console.log("Owner:               " + (await readVault("owner")));
console.log("Approver:            " + (await readVault("approver")));
console.log("Payments so far:     " + (await readVault("paymentCount")));
console.log("------------------------------------------------------------");
