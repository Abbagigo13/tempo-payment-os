# Tempo Payment OS

A programmable payment control plane built on Tempo.

A developer-first layer for defining, controlling, automating, and observing stablecoin payment workflows—without forcing every application to build its own payment infrastructure.

Status: Working local prototype (Phases 1–3 complete)
Network: Tempo (testnet integration planned — Phase 5, blocked on Phase 0 feasibility check)
Budget principle: Free-first. Local development and simulated workflows come first; any feature that requires paid infrastructure, tokens, or services is optional and must be reviewed before use.

1. The problem
Stablecoin transfers are becoming easier to execute, but building a reliable payment product is still more complicated than sending tokens from one address to another.

Teams often have to assemble several separate pieces:
Payment execution: submitting transfers and handling transaction outcomes.

Spending controls: defining who can pay, who can receive funds, how much can be spent, and when approval is required.

Automation: coordinating recurring or conditional workflows.

Operational visibility: understanding payment status, failures, activity, and history.

Integration work: writing and maintaining custom logic for each product.

Safety and accountability: making rules explicit and keeping a useful record of what the system decided.

This creates repeated engineering work. A payroll tool, marketplace, treasury dashboard, or software service may each rebuild similar controls around the same underlying payment rails.

The result is fragmented payment logic, inconsistent safeguards, harder debugging, and a higher barrier for developers who want to use stablecoins without becoming blockchain infrastructure specialists.

The gap
Blockchains provide transaction execution. Applications still need a practical way to describe payment intent, enforce policies, coordinate workflows, and inspect outcomes.

Tempo Payment OS targets that application-layer gap.

1. The solution
Tempo Payment OS is a modular payment control plane that sits between an application and the Tempo network.

It gives developers and operators one place to:

1.Create or prepare payment instructions.

2.Apply policy checks before execution.

3.Route payments for approval when rules require it.

4.Coordinate supported scheduled or conditional workflows.

5.rack execution status and transaction references.

6.Inspect activity and export operational records.

7.Integrate the same capabilities into other applications through a developer-facing interface.

The project is not a new blockchain, wallet, exchange, or general-purpose banking app. It is an orchestration and control layer designed around payment workflows.

Core principle
Define the rules once. Apply them consistently across payment workflows.

A company can configure a policy that allows routine payments up to a set limit, requires an additional approval above that limit, and blocks transfers to recipients outside an approved list. The payment engine evaluates the request before it attempts to execute it.

In the current prototype, policy evaluation runs locally and payments are simulated. Actual enforcement against on-chain transfers depends on the integration and security model implemented for the selected Tempo features. A frontend rule alone is not a security boundary.

1. Why Tempo?
Tempo is a payment-focused blockchain designed around stablecoin payment use cases. Its payment-oriented features make it a natural execution layer to explore for this project.

Tempo's capabilities and interfaces may include features such as:

TIP-20 tokens for stablecoin-oriented assets.

Payment memos for attaching useful payment metadata.

Payment lanes for payment transaction handling.

Fee sponsorship and fee payment options for reducing end-user friction.

Batch and scheduled payment capabilities, subject to the network and tooling available.

Policy-related primitives, where supported by the current network and standards.

Payment OS aims to build useful application-level workflows on top of these capabilities rather than simply reproducing a basic transfer screen.

Compatibility note: Network features, testnet availability, RPC access, SDK APIs, and contract interfaces can change. Before implementing a live integration, verify the current official Tempo documentation and network configuration. Do not assume every capability listed above is available on every network or through the same interface.

1. Who is it for?
Primary users
Developers building products that need stablecoin payment workflows.

Small businesses and startups that want clearer payment operations.

Marketplaces that need payment rules and transaction tracking.

Teams and organizations that need controlled disbursement workflows.

Hackathon builders who want to prototype programmable payment experiences.

Example use cases
Use case How Payment OS could help
Contractor payouts Prepare payout batches, apply limits, and track each payment
Marketplace settlements Coordinate payment states and approval steps
Treasury operations Define spending rules and monitor outgoing transfers
API and service payments Prepare small, policy-controlled payment requests
Team allowances Configure budgets and permitted payment purposes
Recurring disbursements Coordinate repeat payments where supported and safely configured
These are potential use cases. The current prototype demonstrates a subset of them — specifically, single-payment creation, policy evaluation, approval routing, and simulated execution.

1. Product modules
5.1 Overview — implemented
A central operations dashboard that summarizes payment activity and system state.

Current interface elements:
Total processed volume (sum of Completed payments)

Successful payment count

Pending payment count

Total payment record count

Recent payments table (last 5)

Shortcuts to Policies and Automation

All figures come from local demo state. The dashboard labels sample data as such and never implies a real transaction occurred.

5.2 Payment Engine — implemented (simulated)
The payment engine manages the lifecycle of a payment request.

Current lifecycle:
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

mplemented capabilities:

Recipient, email, amount, memo validation

Live policy preview as the user types

Blocked submissions cannot be created

Transaction record created with decision and decisionReason

Status tracking: Pending → Completed (via simulator)

Per-payment detail drawer showing lifecycle and policy evaluation

Clear, human-readable reasons for every policy decision

Not yet implemented:

Real network submission (Phase 5)

Approval workflow UI (approvals are recorded as a decision state, not yet routed to a reviewer)

Failure states beyond the seed data

The engine currently uses a mock/local adapter. A live adapter can be added after Phase 0 feasibility is verified.

5.3 Policy Engine — implemented and tested
The policy engine evaluates whether a payment request meets configured rules.

Implemented policy types:

Maximum amount per payment (daily spending limit — currently $5,000 per rolling 24 hours)

Required approval above a threshold (currently $1,000)

Approved recipient list (currently: recipients with prior Completed payments; disabled by default)

Example policy configuration (src/data/demoData.js):

{
  id: 1,
  name: "Daily spending limit",
  description: "Limit total outgoing payments to $5,000 per day.",
  enabled: true,
  type: "Spending"
}

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

5.4 Automation — UI only
The Automation page presents example workflows (weekly contractor payouts, monthly cloud settlement). Toggles are not yet wired to any state.

Planned:

Workflows backed by a useWorkflows hook

Pause / activate persisting across navigation

Manual "Run now" simulation that creates a synthetic payment through the policy engine

Persistent scheduling (requires a backend or on-chain mechanism — not in scope until Phase 5)

The initial version can demonstrate these workflows with local state and manual triggers. It should not rely on browser timers as a production scheduler. Reliable automation needs a persistent service or supported on-chain scheduling mechanism, plus monitoring and failure handling.

5.5 Developer Interface — concept, partially documented
The Developers page presents an interface concept and a roadmap of integration phases.

Planned features still to build:
API and SDK documentation

Request/response examples for each planned endpoint

Simulated API calls

Copyable integration snippets

Clear distinction between implemented endpoints and proposed interfaces

Illustrative future API:
POST /api/payments/prepare
POST /api/policies/evaluate
POST /api/approvals
GET  /api/payments/:id
GET  /api/activity

These routes are design examples. They are not implemented. They should not be treated as working endpoints until shipped and documented in the codebase.

Illustrative future SDK usage:
const result = await paymentOS.preparePayment({
  recipient: "0x...",
  amount: "25",
  token: "TIP20_TOKEN_ADDRESS",
  memo: "invoice-1042"
});

he exact SDK, token representation, and transaction submission method will be determined by the verified Tempo tooling in Phase 5.

5.6 Activity and Audit Trail — not yet implemented
Payment operations need an understandable record of what happened.

Planned activity view will record, where available:

Payment request ID

Timestamp

Initiating account or application

Recipient and amount

Policy decision

Approval events

Execution status

Transaction hash

Failure reason
The current prototype records decision and decisionReason on each payment, and the detail drawer renders a per-payment lifecycle. A global activity feed (all events across all payments) is planned but not yet built. Every event currently lives in memory and is lost on page reload.

Local records are useful for development, but they are not automatically tamper-proof. A production audit trail needs an explicit trust and retention model.

1. Architecture
The intended architecture separates the user interface, application logic, network adapter, and blockchain execution.
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
Tempo adapter Network-specific RPC and transaction integration Not implemented
Activity store Operational records and status history Partial (per-payment only)
Current prototype architecture
The current implementation is a frontend-only React application:

Local mock data (src/data/demoData.js)

A simulated payment adapter (src/hooks/usePayments.js)

Local policy evaluation (src/lib/policyEngine.js)

In-memory state (no persistence beyond the browser session)

No private keys

No real funds

No paid API dependency

Code layout:
src/
  components/
    PaymentDrawer.jsx     Payment detail panel
    PaymentModal.jsx      New payment form with live policy preview
    PaymentTable.jsx      Payments list (clickable rows)
    PolicyCard.jsx        One policy row on the Policies page
    Sidebar.jsx
    StatCard.jsx
    Topbar.jsx
  data/
    demoData.js           Seed payments, policies, workflows
  hooks/
    usePayments.js        Payments state + policy-aware addPayment
    usePolicies.js        Policies state + toggle
  lib/
    formatters.js         Currency and date formatting
    policyEngine.js       Pure policy evaluator
    policyEngine.test.js  14 test cases
  pages/
    Automation.jsx
    Dashboard.jsx
    Developers.jsx
    Payments.jsx
    Policies.jsx
  App.jsx
  index.css
  main.jsx

  1. Technology stack
Area Technology Cost approach
Frontend React + Vite Free, open source
Styling Custom CSS Free
Icons Lucide React Free, open source
Testing Vitest Free, open source
Smart contracts Solidity, if needed Free tooling
Local EVM development Foundry or another free local tool Local development
Backend Node.js, when needed Free locally
Network integration Official Tempo-compatible tooling Verify free access first
Data Local demo state No hosted database required
Version control Git Free locally
Hosting Optional free tier or local demo Never assume a free tier is permanent
The project remains useful and demonstrable locally without any hosted service or public testnet.

  2. Security and trust
Payment infrastructure must be designed with security as a core requirement.

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
Before handling real funds, the system would need a much stronger security model, including authentication, authorization, key custody or wallet signing design, replay and duplicate-request protection, monitoring, incident response, testing, and potentially professional security review.

Payment OS is an experimental developer project until those requirements are addressed.
9. What makes it different?
Payment OS is not trying to win by offering yet another wallet screen or token swap interface.

Its intended differentiation is the combination of:

Policy-first payments: rules are evaluated as part of the payment workflow, not bolted on after.

Reusable orchestration: applications can reuse common payment operations instead of rebuilding them.

Operational visibility: payment state, decisions, and failures are presented together.

Developer orientation: the product is designed as infrastructure that other products can integrate.

Network-aware design: Tempo is the intended settlement layer, while the application layer handles workflow and controls.

Free-first prototyping: the concept can be built and demonstrated locally without requiring paid services.

The idea is ambitious, and these differentiators only become meaningful if the implementation is reliable, easy to integrate, and measurably better than a team's own lightweight solution.

 1. Development roadmap
Phase 0 — Cost and feasibility checks — ⏸ not started
Review the current official Tempo developer documentation.

Confirm current testnet status and chain configuration.

Identify free RPC and faucet options, if available.

Confirm the supported SDK and transaction flow.

Keep the project local if any required step introduces a cost.

Exit condition: A verified, no-cost path exists for the integration we intend to test—or the project remains in simulation mode.

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

Decision reasons shown per payment (in modal preview, table badge, and detail drawer).

14 test cases in src/lib/policyEngine.test.js; npm test is green.

Exit condition met: Policy decisions are consistent, explainable, and covered by tests.

Phase 4 — Workflow automation — ⏸ not started
Model recurring and delayed workflows.

Add manual simulation controls.

Track workflow state and errors.

Design safe handling for duplicate execution and uncertain outcomes.

Exit condition: A multi-step workflow can be demonstrated reliably in the local environment.

Phase 5 — Tempo testnet adapter — ⏸ blocked on Phase 0
Configure the network using current official information.

Connect through a compatible wallet or safe test account.
Read network and account information.

Submit a small test transaction only after explicit confirmation.

Display the actual transaction hash and verified status.

Keep simulation mode available as a fallback.

Exit condition: A testnet transaction can be independently verified, with no paid dependency.

Phase 6 — Developer experience — ⏸ not started
Finalize the API design.

Add SDK or integration examples.

Document authentication and permissions.

Add example applications and test workflows.

Make setup reproducible from a clean checkout.

Exit condition: Another developer can run the example and understand the integration without relying on undocumented steps.

Phase 7 — Demo and evaluation — ⏸ not started
Prepare a concise problem/solution walkthrough.

Demonstrate a payment being evaluated by policies.

Show an approval path and a blocked payment.

Show the activity record and, if available, a verified testnet transaction.

Document what is implemented, simulated, and planned.

Exit condition: The demo communicates the product's value honestly and clearly.

 1. Success criteria
The early project is evaluated by concrete outcomes rather than feature count.

Already met:

A new developer can run the project locally using documented steps.

A payment request can be validated and simulated end to end.

Policy decisions are deterministic and explainable.

Approval and rejection paths are demonstrable.

No paid service is required for the core local demo.
Still to meet:

Activity records show the important workflow events across all payments (currently per-payment only).

The interface clearly distinguishes demo and on-chain data in every relevant view (partially met — labels exist, but the app never touches real data yet, so this is untested against a live source).

If testnet integration is included, at least one transaction is independently verifiable.

Longer-term metrics could include integration time, policy evaluation reliability, workflow failure rates, and the amount of custom payment logic an integrating team avoids maintaining.

1. Risks and limitations
Risk Mitigation Current state
Tempo APIs or testnet change Verify official docs; isolate network logic in an adapter Adapter not yet built; project stays local
Testnet faucet or RPC unavailable Preserve a fully functional simulation mode Simulation mode is the current mode
Scope becomes too large Build one complete payment-and-policy workflow first Done — single payment + policy + drawer
Policies can be bypassed Enforce critical rules at a trusted execution boundary before production Documented as a known limitation
Automation executes twice Use idempotency, persistent state, explicit recovery rules Not yet implemented
Misleading dashboard metrics Label data provenance; show transaction references Labels present; no on-chain data yet
Security expectations exceed prototype maturity Clearly mark the project experimental and prohibit real-fund use Marked in-app and in this README
Free hosting or services change their terms Keep local development independent of hosting Project runs entirely locally
2. Project scope: now vs. later
Implemented
Dashboard and navigation

Payment request form with validation

Live policy preview in the payment modal

Simulated payment lifecycle (Pending → Completed)

Policy engine with three policy types

Approval, blocked, and allowed decision states

Payment detail drawer with lifecycle timeline

Per-payment policy decision history (via decision and decisionReason)

Policy test suite (14 tests, all green)

Free local development

Planned, if feasible
Activity / audit trail across all payments

Automation workflows backed by shared state

Developer interface with simulated API calls

Real Tempo testnet transactions (Phase 5, after Phase 0)

Wallet connection

Backend API

Persistent workflow scheduler

On-chain policy enforcement or smart-account integration

SDK package

Team roles and permissions

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

 1. Getting started
Requirements
Node.js 18+ and npm

Git (recommended)

A code editor such as VS Code

Install and run
npm install
npm run dev

pen the local URL printed by Vite (typically <http://localhost:5173>).

Run tests
powershell
npm test          # single run
npm run test:watch   # watch mode
Project layout
See §6 above for the full src/ tree.

Cost policy
Before adding a dependency or service, ask:

Is it necessary for the next milestone?

Is there a free and maintainable alternative?

Does it require a card, deposit, token purchase, or paid usage?

Can the project continue locally if it becomes unavailable?

If the answer reveals a required cost, defer or replace that feature rather than spending money.

 1. Vision
Make stablecoin payment workflows easier to build, safer to operate, and simpler to understand.

Tempo Payment OS aims to become a reusable control plane for applications that need more than a transfer: they need policies, approvals, automation, and a clear operational record.

The first goal was intentionally small: build one polished, honest, fully local demonstration of a payment request passing through rules and a workflow. That goal is now met. The next step is to verify a free Tempo testnet integration path (Phase 0) before touching any network code, and to keep the project useful and demonstrable locally regardless of whether that integration becomes possible.
Disclaimer
Tempo Payment OS is an independent experimental project concept. It is not an official Tempo product and does not imply endorsement by Tempo. Network capabilities and integrations must be verified against current official documentation. Nothing in this README is financial, legal, or security advice.
