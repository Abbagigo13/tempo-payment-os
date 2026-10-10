# Tempo integration

This app talks to the Tempo Moderato testnet, both reading chain state and submitting signed transactions. No private keys are stored in the app; every write is signed by a browser wallet extension.

## Network

| Field | Value |
| --- | --- |
| Chain ID | `42431` (`0xa5bf`) |
| RPC | `https://rpc.moderato.tempo.xyz` |
| Explorer | `https://explore.testnet.tempo.xyz` |
| Currency symbol | `USD` |

Defined in `src/lib/tempo.js` as `tempoTestnet`.

## Reading

```js
import { publicClient } from "../src/lib/tempo";
import { TIP20_ABI } from "../src/lib/tip20Abi";

const raw = await publicClient.readContract({
  address: "0x20c0000000000000000000000000000000000000", // pathUSD
  abi: TIP20_ABI,
  functionName: "balanceOf",
  args: ["0x0000000000000000000000000000000000000001"],
});
```

See `examples/read-balance.mjs` for a runnable version.

## Writing

The write path is:

1. The user connects a wallet via EIP-6963 (`src/hooks/useWallet.js`).
2. The user picks a token, recipient, and amount in the Wallet panel.
3. The policy engine evaluates the transfer (`handleWalletSend` in `src/App.jsx`). A blocked transfer stops here and is never sent to the wallet. An "approval" result shows a warning in the confirm box.
4. The app calls `sendTip20Transfer` (`src/lib/wallet.js`), which validates the addresses, checks that the wallet is on Tempo Moderato, reads the token's decimals, and rejects zero amounts.
5. The wallet extension signs and submits.
6. The app waits for the transaction receipt (up to 60 seconds) and checks that it succeeded.
7. The result is shown with an explorer link and recorded in the payment history.

### Result states

`sendTip20Transfer` returns one of:

| Result | Meaning | Recorded as |
| --- | --- | --- |
| `{ ok: true, confirmed: true, hash }` | Mined and succeeded on-chain | Completed |
| `{ ok: true, confirmed: false, hash }` | Submitted, but not confirmed within the timeout. It may still confirm later. | Pending |
| `{ ok: false, hash, error }` | Submitted, but reverted on-chain | Failed |
| `{ ok: false, error }` | Never submitted (invalid input, wrong network, wallet rejected) | Not recorded |

## Important notes

**Gas must be explicit.** Tempo uses stablecoins for fees, but wallet extensions cannot price Tempo gas natively. MetaMask overshoots the gas limit by about 580x, which exceeds Tempo's 30M per-transaction cap. The transfer call passes `gas: 300000n` explicitly to bypass the wallet's estimator.

```js
await walletClient.writeContract({
  account,
  address: tokenAddress,
  abi: TIP20_ABI,
  functionName: "transfer",
  args: [to, rawAmount],
  gas: 300000n, // required
});
```

**Decimals must be read from the contract.** pathUSD uses 6 decimals, not 18. Never hardcode this. `getTokenDecimals()` in `src/lib/tip20.js` reads and caches the value.

**Wallet support is limited.** Verified with MetaMask. OKX Wallet cannot sign Tempo transactions: the fee estimator fails and the Confirm button stays disabled. Any EIP-6963 wallet is worth trying, but MetaMask is the known-working path today.

## Faucet

Testnet pathUSD is available at <https://tempo.xyz/faucet>. Request funds to your connected wallet address, wait about 10 seconds, then verify in the app's Network panel.

## Known limitations

1. No wallet connect restore across reloads. You reconnect each session.
2. Wallets may mis-display TIP-20 amounts in their signing dialog. Always verify in the app's confirmation box first.
3. No memo support yet on transfers (Tempo supports memos natively; this is a planned addition).
4. The payment history lives in memory. Reloading the page resets it, so the daily limit starts again from the sample data.
