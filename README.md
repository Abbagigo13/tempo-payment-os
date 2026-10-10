# Tempo Payment OS

> **A programmable payment control plane built on Tempo.**
>
> A developer-first layer for defining, controlling, automating, and observing stablecoin payment workflows—without forcing every application to build its own payment infrastructure.

**Status:** Working local prototype (Phases 1–6 complete; live read + write on Tempo testnet)  
**Network:** Tempo Moderato testnet (chain ID 42431) — verified TIP-20 transfer on-chain  
**Budget principle:** Free-first. Local development and simulated workflows come first; any feature that requires paid infrastructure, tokens, or services is optional and must be reviewed before use.

---

## 1. The problem

Stablecoin transfers are becoming easier to execute, but building a reliable payment product is still more complicated than sending tokens from one address to another.

Teams often have to assemble several separate pieces:

- **Payment execution:** submitting transfers and handling transaction outcomes.
- **Spending controls:** defining who can pay, who can receive funds, how much can be spent, and when approval is required.
- **Automation:** coordinating recurring or conditional workflows.
- **Operational visibility:** understanding payment status, failures, activity, and history.
- **Integration work:** writing and maintaining custom logic for each product.
- **Safety and accountability:** making rules explicit and keeping a useful record of what the system decided.

This creates repeated engineering work. A payroll tool, marketplace, treasury dashboard, or software service may each rebuild similar controls around the same underlying payment rails.

The result is fragmented payment logic, inconsistent safeguards, harder debugging, and a higher barrier for developers who want to use stablecoins without becoming blockchain infrastructure specialists.

### The gap

Blockchains provide transaction execution. Applications still need a practical way to **describe payment intent, enforce policies, coordinate workflows, and inspect outcomes**.

Tempo Payment OS targets that application-layer gap.

---

## 2. The solution

Tempo Payment OS is a modular payment control plane that sits between an application and the Tempo network.

It gives developers and operators one place to:

1. Create or prepare payment instructions.
2. Apply policy checks before execution.
3. Route payments for approval when rules require it.
4. Coordinate supported scheduled or conditional workflows.
5. Track execution status and transaction references.
6. Inspect activity and export operational records.
7. Integrate the same capabilities into other applications through a developer-facing interface.

The project is **not a new blockchain, wallet, exchange, or general-purpose banking app**. It is an orchestration and control layer designed around payment workflows.

### Core principle

**Define the rules once. Apply them consistently across payment workflows.**

A company can configure a policy that allows routine payments up to a set limit, requires an additional approval above that limit, and blocks transfers to recipients outside an approved list. The payment engine evaluates the request before it attempts to execute it.

In the current prototype, policy evaluation runs locally and payments are simulated. Actual enforcement against on-chain transfers depends on the integration and security model implemented for the selected Tempo features. A frontend rule alone is not a security boundary.

---

## 3. Why Tempo?

Tempo is a payment-focused blockchain designed around stablecoin payment use cases. Its payment-oriented features make it a natural execution layer to explore for this project.

Tempo's capabilities and interfaces may include features such as:

- **TIP-20 tokens** for stablecoin-oriented assets.
- **Payment memos** for attaching useful payment metadata.
- **Payment lanes** for payment transaction handling.
- **Fee sponsorship and fee payment options** for reducing end-user friction.
- **Batch and scheduled payment capabilities**, subject to the network and tooling available.
- **Policy-related primitives**, where supported by the current network and standards.

Payment OS aims to build useful application-level workflows on top of these capabilities rather than simply reproducing a basic transfer screen.

> **Compatibility note:** Network features, testnet availability, RPC access, SDK APIs, and contract interfaces can change. Before implementing a live integration, verify the current official Tempo documentation and network configuration. Do not assume every capability listed above is available on every network or through the same interface.

---

## 4. Who is it for?

### Primary users

- **Developers** building products that need stablecoin payment workflows.
- **Small businesses and startups** that want clearer payment operations.
- **Marketplaces** that need payment rules and transaction tracking.
- **Teams and organizations** that need controlled disbursement workflows.
- **Hackathon builders** who want to prototype programmable payment experiences.

### Example use cases

| Use case | How Payment OS could help |
| --- | --- |
| Contractor payouts | Prepare payout batches, apply limits, and track each payment |
| Marketplace settlements | Coordinate payment states and approval steps |
| Treasury operations | Define spending rules and monitor outgoing transfers |
| API and service payments | Prepare small, policy-controlled payment requests |
| Team allowances | Configure budgets and permitted payment purposes |
| Recurring disbursements | Coordinate repeat payments where supported and safely configured |

These are potential use cases. The current prototype demonstrates a subset of them — specifically, single-payment creation, policy evaluation, approval routing, simulated execution, and a live read/write integration with the Tempo Moderato testnet.

---

## 5. Product modules

### 5.1 Overview — **implemented**

A central operations dashboard that summarizes payment activity and system state.

Current interface elements:

- Total processed volume (sum of Completed payments)
- Successful payment count
- Pending payment count
- Total payment record count
- Recent payments table
- Shortcuts to Policies and Automation
- **Live Tempo network panel** — reads chain ID, block number, latency, and any TIP-20 balance from the public testnet RPC
- **Browser wallet panel** — EIP-6963 wallet picker; signs TIP-20 transfers with an injected wallet. No private keys touch the app.

All figures come from local demo state unless explicitly labeled otherwise. The dashboard separates "Sample data" from live network data visually.

### 5.2 Payment Engine — **implemented (simulated)**

The payment engine manages the lifecycle of a payment request.

Current lifecycle:

```text
Draft (form)
  |
  v
Validate request (client-side)
  |
  v
Evaluate policies (policy engine)
  |
  +----> Blocked (submit disabled, reason shown)
  |
  +----> Approval required (record created with decision="approval")
  |
  +----> Allowed (record created with decision="allowed")
  |
  v
Pending
  |
  v
Completed / Failed (via simulator)

Implemented capabilities:

Recipient, email, amount, memo validation

Live policy preview as the user types

Blocked submissions cannot be created

Transaction record created with decision and decisionReason

Status tracking: Pending → Completed (via simulator)

Per-payment detail drawer showing lifecycle and policy evaluation

Clear, human-readable reasons for every policy decision

5.3 Policy Engine — implemented and tested
The policy engine evaluates whether a payment request meets configured rules.

Implemented policy types:

Maximum amount per payment (daily spending limit — currently $5,000 per rolling 24 hours)

Required approval above a threshold (currently $1,000)
Approved recipient list (currently: recipients with prior Completed payments; disabled by default)

Evaluation semantics:

Only Completed payments within the last 24 hours count toward the daily limit.

A payment being re-evaluated is excluded from its own sum.

Blocked beats approval. Approval beats allowed.

Every policy returns a plain-English detail string.

Test coverage:

14 test cases in src/lib/policyEngine.test.js

Covers: all outcome types, precedence rules, disabled policies, 24-hour window, self-exclusion, and result shape

Run with npm test

Security boundary: These rules are application-level checks. A user who can bypass the application may bypass them unless the relevant controls are enforced by smart-account permissions, contracts, token policies, or another trusted execution layer. Production use requires threat modeling, secure key management, authorization checks, and independent testing.
5.4 Automation — implemented (local)
Workflows are backed by a useWorkflows hook. Toggling Active/Paused persists across navigation, and Run now creates a synthetic payment through the policy engine — leaving a full record in both the payments list and the activity log.

There is no persistent scheduler, no background execution, and no idempotency protection yet — those are prerequisites for any real automation.

5.5 Developer Interface — live examples
The Developers page presents real code snippets from this repository — policy evaluation, TIP-20 balance reads, and payment creation — plus a live "Try the policy engine" demo where a visitor can type a recipient and amount and see the current decision.

There is no HTTP API; every example calls a function that exists in the codebase. Anything labeled "Next" or "Planned" in the roadmap is not implemented.

Illustrative future API routes (not yet shipped):
POST /api/payments/prepare
POST /api/policies/evaluate
POST /api/approvals
GET  /api/payments/:id
GET  /api/activity

5.6 Activity and Audit Trail — implemented (in-memory)
The activity feed captures:

Payment creation

Policy evaluation (with decision and reason)

Blocked attempts

Status changes

Each payment record also stores decision and decisionReason, and the detail drawer renders a full lifecycle timeline. The feed is session-scoped and clears on page reload.

A durable audit trail requires an explicit trust and retention model — not implemented here.

6. Architecture
                 Applications / Operators
                            |
                            v
                  Payment OS Dashboard
                            |
                            v
                   Application API
                            |
             +--------------+--------------+
             |              |              |
             v              v              v
        Payment Engine  Policy Engine  Workflow Engine
             |              |              |
             +--------------+--------------+
                            |
                            v
                     Tempo Adapter
                            |
                            v
                      Tempo Network
                            |
                            v
                 Transaction / Event Results
                            |
                            v
                  Status + Activity Records


Architectural responsibilities
Layer Responsibility Status
Dashboard User interface, forms, status, operator actions Implemented
Application API Input validation, authentication, orchestration Not implemented (in-browser orchestration only)
Payment engine Payment lifecycle and execution requests Implemented (simulated)
Policy engine Rule evaluation and approval decisions Implemented and tested
Workflow engine Scheduling and multi-step coordination Not implemented
Tempo adapter Network-specific RPC and transaction integration Read + write (live testnet; TIP-20 transfers verified)
Activity store Operational records and status history Partial (session-scoped)

The Tempo adapter supports both read and write access to the Moderato testnet via viem and the EIP-6963 provider API. Reads: chain ID, block number, latency, TIP-20 balances. Writes: TIP-20 transfers signed by an injected wallet (MetaMask verified). No private keys are stored in the app.

Current prototype architecture
The current implementation is a frontend-only React application:

Local mock data (src/data/demoData.js)

A simulated payment adapter (src/hooks/usePayments.js)

Local policy evaluation (src/lib/policyEngine.js)

Live read/write Tempo adapter (src/lib/tempo.js, src/lib/wallet.js)

In-memory state (no persistence beyond the browser session)

No private keys

No real funds on mainnet

No paid API dependency

Project layout
src/
  components/
    ActivityPanel.jsx
    NetworkPanel.jsx
    PaymentDrawer.jsx
    PaymentModal.jsx
    PaymentTable.jsx
    PolicyCard.jsx
    Sidebar.jsx
    StatCard.jsx
    Topbar.jsx
    WalletPanel.jsx
  data/
    demoData.js
  hooks/
    useActivity.js
    usePayments.js
    usePolicies.js
    useTempoStatus.js
    useWallet.js
    useWorkflows.js
  lib/
    activityLog.js
    formatters.js
    policyEngine.js
    policyEngine.test.js
    tempo.js
    tip20.js
    tip20Abi.js
    wallet.js
  pages/
    Automation.jsx
    Dashboard.jsx
    Developers.jsx
    Payments.jsx
    Policies.jsx
  App.jsx
  index.css
  main.jsx
docs/
  getting-started.md
  policy-engine.md
  tempo-integration.md
examples/
  evaluate-policy.mjs
  read-balance.mjs

  . Technology stack
Area Technology Cost approach
Frontend React + Vite Free, open source
Styling Custom CSS Free
Icons Lucide React Free, open source
Testing Vitest Free, open source
Network integration viem 2.x (with native viem/tempo module) Free, verified on testnet
Wallet integration EIP-6963 provider discovery Free
Smart contracts Solidity, if needed Free tooling
Local EVM development Foundry or another free local tool Local development
Backend Node.js, when needed Free locally
Data Local demo state No hosted database required
Version control Git Free locally
Hosting Optional free tier or local demo Never assume a free tier is permanent

The project remains useful and demonstrable locally without any hosted service or public testnet.

8. Security and trust
Principles
Never ask users to paste private keys or seed phrases into the dashboard.

Never store private keys in browser storage.

Validate addresses, token identifiers, amounts, and network settings.

Treat frontend policy checks as convenience controls, not authoritative security enforcement.

Require explicit confirmation for consequential actions.

Make approval requirements visible.

Separate simulated transactions from real transactions.

Avoid automatic retries when a transaction's outcome is uncertain.

Keep secrets out of source control and client-side bundles.
Use test accounts and test assets for development.

Document known limitations and unsupported cases.

Production readiness is a separate milestone
Before handling real funds, the system would need authentication, authorization, key custody design, replay and duplicate-request protection, monitoring, incident response, testing, and potentially professional security review.

Payment OS is an experimental developer project until those requirements are addressed.

9. What makes it different?
Policy-first payments: rules are evaluated as part of the payment workflow, not bolted on after.

Reusable orchestration: applications can reuse common payment operations instead of rebuilding them.

Operational visibility: payment state, decisions, and failures are presented together.

Developer orientation: the product is designed as infrastructure that other products can integrate.
Network-aware design: Tempo is the intended settlement layer, while the application layer handles workflow and controls.

Free-first prototyping: the concept can be built and demonstrated locally without requiring paid services.

10. Development roadmap
Phase 0 — Cost and feasibility checks — ✅ complete
Review the current official Tempo developer documentation.

Confirm current testnet status and chain configuration.

Identify free RPC and faucet options, if available.

Confirm the supported SDK and transaction flow.

Keep the project local if any required step introduces a cost.

Findings: Public testnet is Moderato (chain ID 42431, RPC https://rpc.moderato.tempo.xyz). Free faucet, free RPC (20 req/min per IP), TypeScript SDK via viem with native Tempo support, TIP-20 tokens with native memos, and free fee sponsorship on testnet. No paid dependency required.

Phase 1 — Dashboard foundation — ✅ complete
React + Vite project created.

Navigation and application shell built.

Overview, Payments, Policies, Automation, Developers pages present.

Consistent dark visual system established.
Demo data clearly labeled.

Exit condition met: Application runs locally; main navigation works.

Phase 2 — Simulated payment workflows — ✅ complete
Payment creation and validation implemented.

Simulated transaction states (Pending → Completed via simulator).

Payment history and detail view implemented.

Useful error and empty states present.

Simulated records are clearly distinguished from any real transfer.

Exit condition met: A complete payment lifecycle can be demonstrated without a wallet or network connection.

Phase 3 — Policy engine — ✅ complete
Policy schema defined.

Amount limits and recipient allowlist logic implemented.

Approval thresholds implemented.
Decision reasons shown per payment.

14 test cases in src/lib/policyEngine.test.js; npm test is green.

Exit condition met: Policy decisions are consistent, explainable, and covered by tests.

Phase 4 — Workflow automation — ✅ complete
Workflows modeled with local state.

Manual Run-now controls implemented.

Toggle state persists across navigation.

Run-now creates a synthetic payment through the policy engine.

Note: Workflows are simulated. There is no persistent scheduler, no background execution, and no idempotency protection yet.

Phase 5 — Tempo testnet adapter — ✅ complete
Read path:

Chain configured via viem using the official Moderato endpoints.

Public RPC connection verified in-browser.
Live reads: chain ID, latest block, latency, TIP-20 balances.

Write path:

Wallet connection via EIP-6963 discovery — user picks MetaMask, OKX, or any injected provider.

Connected wallet's TIP-20 balance readable via the Network panel.

TIP-20 transfers with explicit gas: 300000n (wallets cannot estimate Tempo gas natively).

Transaction hash returned and displayed with a link to explore.testnet.tempo.xyz.

Verified on-chain: a 1 pathUSD self-transfer was independently confirmed on the Moderato explorer.

Phase 6 — Developer experience — ✅ complete
MIT license.

docs/ folder with three guides: getting started, policy engine, Tempo integration.

examples/ folder with two runnable scripts (evaluate-policy.mjs, read-balance.mjs).

README restructured to point to the docs.

Setup verified from a clean checkout.
Exit condition met: Another developer can run the example and understand the integration without relying on undocumented steps.

Phase 7 — Demo and evaluation — ⏸ not started
Prepare a concise problem/solution walkthrough.

Demonstrate a payment being evaluated by policies.

Show an approval path and a blocked payment.

Show the activity record and a verified testnet transaction.

Document what is implemented, simulated, and planned.

Exit condition: The demo communicates the product's value honestly and clearly.

11. Success criteria
MET:
A new developer can run the project locally using documented steps.

A payment request can be validated and simulated end to end.

Policy decisions are deterministic and explainable.

Approval and rejection paths are demonstrable.

Activity records show workflow events across all payments in the session.

No paid service is required for the core local demo.

At least one testnet transaction is independently verifiable.

The interface distinguishes demo and on-chain data.

Still to meet:

Production-grade distinction between simulated and real payments (currently clear by panel, not yet enforced at the data layer).

Wallet-agnostic signing (verified with MetaMask; OKX cannot estimate Tempo gas).

Durable audit trail across reloads.
12. Risks and limitations
Risk Mitigation Current state
Tempo APIs or testnet change Verify official docs; isolate network logic in an adapter Adapter is isolated in src/lib/tempo.js and src/lib/wallet.js
Testnet faucet or RPC unavailable Preserve a fully functional simulation mode Simulation mode is always available
Scope becomes too large Build one complete payment-and-policy workflow first Done
Policies can be bypassed Enforce critical rules at a trusted execution boundary before production Documented as a known limitation
Automation executes twice Use idempotency, persistent state, explicit recovery rules Not yet implemented
Misleading dashboard metrics Label data provenance; show transaction references Labels present; network panel is read-only and clearly labeled
Security expectations exceed prototype maturity Clearly mark the project experimental and prohibit real-fund use Marked in-app and in this README
Free hosting or services change their terms Keep local development independent of hosting Project runs entirely locally
Wallets cannot estimate Tempo gas Hardcode a conservative gas value in the transfer call Verified: MetaMask signs with gas: 300000n; OKX cannot sign at all
Wallets may mis-display TIP-20 amounts Show the raw amount in the app's confirmation box before signing Implemented — app shows amount and recipient before wallet opens.


13. Project scope: now vs. later
Implemented
Dashboard and navigation

Payment request form with validation

Live policy preview in the payment modal

Simulated payment lifecycle (Pending → Completed)

Policy engine with three policy types

Approval, blocked, and allowed decision states

Payment detail drawer with lifecycle timeline

Session-scoped activity log

Automation workflows with Run-now (local)

Read-only Tempo testnet connection

Wallet connect via EIP-6963 (MetaMask, OKX, and any injected provider)

Live TIP-20 balance reads from Moderato testnet

Signed TIP-20 transfers submitted to Moderato testnet (verified on-chain)
Transaction hash + explorer link after submission

MIT license, docs folder, runnable examples

Planned, if feasible
Durable activity log across sessions

Persistent workflow scheduler

HTTP API for external integrations

SDK package for Node.js and browser

On-chain policy enforcement or smart-account integration

Team roles and permissions

Memo-carrying TIP-20 transfers

Production monitoring and security review

Explicitly out of scope for now
Mainnet transactions

Custody of user funds
Paid AI integrations

Paid RPC or hosting requirements

A new token

A new blockchain

A general-purpose exchange

Claims of production-grade compliance or security
14. Getting started
git clone https://github.com/Abbagigo13/tempo-payment-os.git
cd tempo-payment-os
npm install
npm run dev


Open the URL that Vite prints (usually http://localhost:5173). No environment variables, no database, no API keys.

Documentation
Getting started — clean checkout to running app

Policy engine — how decisions work, how to add a policy

Tempo integration — reading balances, sending transfers, wallet limitations

Examples
Two standalone scripts demonstrate the primitives without React:
node examples/evaluate-policy.mjs    # run the policy engine, print decisions
node examples/read-balance.mjs       # read a TIP-20 balance from Moderato

Tests

npm test              # single run (14 tests)
npm run test:watch    # watch mode
Cost policy
Before adding a dependency or service, ask:

Is it necessary for the next milestone?

Is there a free and maintainable alternative?

Does it require a card, deposit, token purchase, or paid usage?

Can the project continue locally if it becomes unavailable?

If the answer reveals a required cost, defer or replace that feature rather than spending money.

15. Vision
Make stablecoin payment workflows easier to build, safer to operate, and simpler to understand.

Tempo Payment OS aims to become a reusable control plane for applications that need more than a transfer: they need policies, approvals, automation, and a clear operational record.

The first goal was intentionally small: build one polished, honest, fully local demonstration of a payment request passing through rules and a workflow. That goal is met. It has since been
xtended to a working, verified integration with the Tempo Moderato testnet — both reading live chain state and signing TIP-20 transfers through a browser wallet. No private keys touch the app, no paid infrastructure is required, and the project remains fully demonstrable locally.

Disclaimer
Tempo Payment OS is an independent experimental project concept. It is not an official Tempo product and does not imply endorsement by Tempo. Network capabilities and integrations must be verified against current official documentation. Nothing in this README is financial, legal, or security advice.

---

Paste it in, save, then:

```powershell
git add README.md
git commit -m "README: Phase 6 complete; docs, examples, and getting-started"
git push


