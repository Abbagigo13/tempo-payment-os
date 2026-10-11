# Getting started

From a clean clone to a running app in three commands.

## Requirements

- Node.js 18 or later (the contract tools were tested on Node 24)
- npm
- A modern browser (Chrome, Edge, Firefox, Safari)
- Optional: a browser wallet (MetaMask verified) for testnet writes

## Run it

```bash
git clone https://github.com/Abbagigo13/tempo-payment-os.git
cd tempo-payment-os
npm install
npm run dev
```

Open the URL that Vite prints (usually http://localhost:5173).

That's it. No environment variables, no database, no API keys.

## Run the tests

```bash
npm test
```

28 tests, all green, covering the policy engine and the local storage helpers.

The smart contract has its own tests, which run with Hardhat from the `contracts` folder:

```bash
cd contracts
npm install
npx hardhat test
```

19 tests, covering the policy vault. See [Policy vault](vault.md).

## What works out of the box

- **Dashboard**: payment overview, a live Tempo network panel, a browser wallet panel, and an on-chain policy vault panel (readable without a wallet)
- **Payments**: create, block, or route payments through the policy engine; simulate execution
- **Policies**: toggle policy rules; changes affect the payment modal live
- **Automation**: pause or activate workflows; "Run now" creates a payment through the policy engine
- **Developers**: live code examples and a policy-engine sandbox

Your payments, activity, policy switches and workflow state are saved in the browser, so they survive a reload. The **Reset demo data** button on the Dashboard clears them.

## What requires a wallet

The Browser wallet panel on the Dashboard connects to MetaMask (verified) or any EIP-6963 wallet. A testnet transfer requires:

1. Connecting a wallet
2. Being on the Tempo Moderato testnet (chain ID 42431)
3. Having pathUSD on that address

Get testnet funds at the Tempo faucet: https://tempo.xyz/faucet

To use the policy vault panel to send or approve payments, connect the vault's owner wallet (to send) or approver wallet (to approve or reject). Other wallets can only read.

## Troubleshooting

- **`npm install` hangs**: press Ctrl+C, run `npm cache clean --force`, then retry.
- **Blank page**: check the browser console for import errors; usually a missing file.
- **Wallet connect fails**: install MetaMask if you don't have a wallet, and check that no extension is blocking `window.ethereum`.
- **Transfer fails with "insufficient balance"**: you're trying to send more than you have, or the token dropdown is on a different token than the one you hold.
- **The vault panel shows an RPC error**: the public testnet RPC is rate limited. Wait a few seconds and click Refresh once.
