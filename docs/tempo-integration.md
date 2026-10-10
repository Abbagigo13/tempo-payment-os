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
2. The user picks a token, recipient, and amount in the Wallet panel, and optionally a memo.
3. The policy engine evaluates the transfer (`handleWalletSend` in `src/App.jsx`). A blocked transfer stops here and is never sent to the wallet. An "approval" result shows a warning in the confirm box.
4. The app calls `sendTip20Transfer` (`src/lib/wallet.js`), which validates the addresses, checks that the wallet is on Tempo Moderato, reads the token's decimals, rejects zero amounts, and checks the memo length.
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

## Memos

TIP-20 tokens support a 32-byte memo on transfers through `transferWithMemo(to, amount, memo)`. The Wallet panel has an optional memo field.

- With no memo, the app sends a plain `transfer`.
- With a memo, the text is converted to 32 bytes, padded on the right, and sent with `transferWithMemo`. The transfer emits a `TransferWithMemo` event with the memo indexed.
- The limit is 32 **bytes**, not characters. Non-English letters and emoji use more than one byte each. The Wallet panel shows a live byte count and disables sending when the memo is too long.
- The memo is also saved as the description of the payment in the app's history.
- Block explorers may show the unused padding bytes as extra symbols after the text. The memo itself is correct. To read it back, strip the null characters.

The conversion lives in `encodeMemo` in `src/lib/wallet.js`.

## Important notes

**Gas must be explicit.** Tempo uses stablecoins for fees, but wallet extensions cannot price Tempo gas natively. MetaMask overshoots the gas limit by about 580x, which exceeds Tempo's 30M per-transaction cap. The transfer calls pass `gas: 300000n` explicitly to bypass the wallet's estimator. This limit has been verified for both plain and memo transfers on the testnet.

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

## Saved data

The app saves its state in the browser's local storage, so it survives a page reload:

| Key | What it holds |
| --- | --- |
| `tempo-payment-os:payments:v1` | The payment history |
| `tempo-payment-os:activity:v1` | The activity feed (the most recent 200 events) |
| `tempo-payment-os:policies:v1` | Which policies are switched on or off |
| `tempo-payment-os:workflows:v1` | Each workflow's status and last run result |

Policy and workflow definitions (names, descriptions, payment templates) always come from `src/data/demoData.js`. Only the settings above are saved on top of them, so a change to a definition in code shows up even if someone already has saved data.

Saved data is validated when it is loaded. Damaged data is ignored and the app falls back to the sample data. The version in each key (`v1`) is there so a future change to the saved format can use a new key without breaking old data.

Because the history is saved, the daily spending limit also survives a reload. To clear it, use the **Reset demo data** button on the Dashboard. It deletes all four saved items and reloads the page with the sample data. It does not affect your wallet connection or anything on-chain.

The storage helpers are in `src/lib/storage.js`.

## Known limitations

1. No wallet connect restore across reloads. You reconnect each session.
2. Wallets may mis-display TIP-20 amounts in their signing dialog. Always verify in the app's confirmation box first.
3. Saved data lives only in one browser on one device. Clearing site data removes it.
