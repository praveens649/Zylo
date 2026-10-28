# Zylo — Project Agent Instructions

## 1. Project overview

Zylo is a fictional Indian SIM provider inspired by services such as Jio and Airtel. Customers can create an account, buy a SIM, choose a phone number and mobile plan, pay through Stripe test mode, recharge, and manage their connection.

Zylo's differentiators are **Data Bank**, **Data Transfer**, and a behaviour-aware **Data Quest** system. The supplied *Zylo Innovation* PDF also describes Business SIM verification, Number Parking, Data Loan, and Travel Connect/eSIM. These are product concepts, not proof that carrier infrastructure exists. Implement them as a clearly labelled demo unless real integrations are explicitly configured.

This file is the working contract for any AI coding agent contributing to the repository. The existing repository is the source of truth for its framework, dependencies, naming conventions, and current implementation.

## 2. Product goals

1. Complete the customer journey: signup/login → choose SIM and number → select plan → test payment → view SIM/plan status.
2. Provide a separate, protected admin experience for managing customers, SIM inventory, plans, orders/payments, and support.
3. Implement Data Bank and Data Transfer as real application flows with validated, auditable balance changes.
4. Implement Data Quest as an event-driven, behaviour-aware quest and rewards system, not a static list of cards.
5. Preserve the extra innovation concepts from the supplied PDF in a staged, extensible design.
6. Build a responsive, accessible, professional interface with consistent design tokens and useful loading, empty, error, and success states.
7. Be honest about demo boundaries: Stripe test payments are not real charges, and simulated data usage does not affect real mobile networks.

## 3. Instructions for the coding agent

Before editing anything:

- Inspect the repository structure, package manifests, scripts, environment examples, routing, existing UI components, authentication, API/data layer, and database models.
- Identify what is already implemented. Extend it instead of replacing it wholesale.
- Follow the existing stack and conventions. Do not migrate frameworks or replace libraries without a strong technical reason.
- Use strict types where TypeScript is present. Avoid `any` unless justified.
- Reuse existing UI primitives and design tokens. Do not introduce a second component system unnecessarily.
- Keep presentation, domain logic, persistence, and payment integration separated.
- Do not delete working features or make unrelated refactors.
- Never hardcode secrets or commit `.env` files. Update `.env.example` with variable names and safe placeholders only.
- Never trust prices, balances, ownership, role claims, transfer amounts, or payment status sent by the browser.
- Validate data on the server and enforce authorization at the API/data layer, not merely by hiding buttons.
- Work in small increments. Run available lint, type-check, tests, and build commands after meaningful changes.
- Do not claim that an integration or feature works unless it has been implemented and verified.
- If the repository's current architecture conflicts with this document, explain the conflict and choose the smallest safe adaptation.
- If a decision is missing, choose the simplest safe default, document it, and continue unless it risks data loss, security, or major rework.

## 4. Roles and permissions

### Customer
Customers can manage only their own:
- Profile and settings.
- SIMs, phone numbers, active plan, and benefits.
- Orders, payment records, and recharge history.
- Data Bank balance and ledger.
- Data transfers and received transfers.
- Quests, achievements, XP, badges, and rewards.
- Support tickets.

### Admin
Admins can:
- View dashboard metrics for customers, SIMs, plans, orders, payments, and support.
- Search and inspect customer accounts.
- Suspend/reactivate demo accounts with a reason and audit record.
- Create, edit, disable, and inspect plans.
- Add, reserve, edit, and retire numbers/SIM inventory.
- Inspect SIM activation status.
- Review orders and payment outcomes.
- Manage support tickets.
- Configure Data Bank, transfer, quest, reward, parking, and loan rules when those features are implemented.
- View relevant engagement and operational reports.

### Security requirements
- Enforce role checks in trusted server/API code.
- Customers must not access or mutate another customer's records.
- Admin-only operations must reject customer sessions.
- Validate all incoming payloads and apply rate limits to sensitive operations where supported.
- Use secure session/token handling consistent with the repository.
- Use database transactions or equivalent atomic operations for balance changes, payment state transitions, number reservations, and quest reward claims.
- Add idempotency protections to payment webhooks and reward/transfer processing.
- Record consequential admin actions and balance-changing operations in an audit trail.
- Do not expose authentication tokens, secrets, or sensitive identity documents in logs or client responses.

## 5. Core customer modules

### 5.1 Signup and login
- Sign up, log in, log out, and handle invalid credentials and expired sessions.
- Validate fields and show actionable errors, loading states, and success feedback.
- Prevent duplicate accounts and unauthorized access.

### 5.2 Customer dashboard
Display data derived from the current user's records:
- SIM number and activation status.
- Current plan, price, validity/expiry, and renewal state.
- Remaining data, calls, and SMS where represented by the demo model.
- Data Bank balance and recent activity.
- Quick actions for recharge, transfer data, Data Bank, support, and quests.
- Recent transactions and relevant notifications.

Do not display fabricated metrics as if they were real. Seed demo data only through an explicit development/demo seed process.

### 5.3 SIM and number management
- Show available numbers from inventory and allow filtering/searching.
- A number must not be allocated to two customers.
- Reserve a selected number during checkout with an expiry or other conflict-safe strategy.
- Confirm allocation only after the required purchase/payment step succeeds.
- Represent SIM states explicitly, such as `available`, `reserved`, `pending_activation`, `active`, `suspended`, and `retired`, adapting to the existing model.
- Keep activation simulated unless an actual carrier API exists.

### 5.4 Plans
- Show active plans with price, validity, data allowance, call/SMS benefits, and other configured benefits.
- Support plan comparison and clear display of recurring/one-time terms.
- Disabled plans should not be purchasable by new customers, while historical purchases remain visible.
- Prices and benefits must come from trusted server-side plan records.

### 5.5 Recharge, checkout, and payments
- Support purchase/recharge through Stripe **test mode** when configured.
- Create payment intent/checkout sessions server-side.
- Verify payment completion using trusted Stripe webhook events; do not treat a client redirect alone as proof of payment.
- Store orders and payment attempts with clear statuses such as `pending`, `succeeded`, `failed`, and `refunded` where applicable.
- Make webhook processing idempotent.
- Activate/renew the plan only after confirmed payment.
- If Stripe is not configured, provide an explicitly labelled development-only payment simulator, never a fake production checkout.
- Never store card numbers or CVC values.

### 5.6 Transaction history
- List the authenticated user's orders, recharges, transfers, and applicable feature transactions.
- Show amount, date, type, status, reference, and receipt/detail view.
- Include pagination/filtering if appropriate for the current architecture.

### 5.7 Profile and settings
- Allow validated updates to permitted profile fields.
- Require appropriate re-authentication for sensitive account changes if supported.
- Never let a customer edit their own role or account status.

### 5.8 Support
- Customers can create tickets, choose a category, provide a description, and track status.
- Admins can review, assign/update, respond to, and resolve tickets.
- Store ticket history and timestamps. Validate status transitions.

## 6. Innovation features from the supplied PDF

The PDF contains several distinct product ideas. Implement them in stages so the core SIM/recharge flow stays stable.

### 6.1 Data Bank — core innovation

**Purpose:** Save eligible unused data, track saved data lots, and redeem data later. The PDF illustrates daily usage, automatic save to bank, bank balance, redemption, and expiry handling.

Expected customer flow:
1. Show today's simulated data usage and unused eligible data.
2. Apply the configured saving rule and show how much data was saved.
3. Show Data Bank balance and individual saved-data lots, including amount, source/date, and expiry.
4. Allow a customer to redeem eligible data, with a confirmation and updated balance.
5. Show activity history for saved, redeemed, and expired data.

Rules:
- Put configurable rules in trusted server-side configuration/admin settings, not scattered frontend constants.
- The PDF's example rule set mentions saving eligible unused data, a daily cap, a maximum bank balance, data lots, expiry after a configured period, and no negative balances. Treat the precise values as configurable demo defaults, not universal telecom policy.
- The diagram's example shows a 10 GB bank cap, a 500 MB daily saving cap, and 90-day expiry. Use these as initial demo defaults only if no project settings already exist.
- Redeem the earliest-expiring eligible lot first (FEFO) unless the repository already defines a different explicit policy.
- Prevent duplicate saving of the same usage event.
- Do not allow redemption above the available balance or reuse of expired lots.
- Every change must create a ledger entry. Do not update only a displayed balance.
- Expiry must be handled by a scheduled job or a deterministic server-side expiry process, not only by hiding expired records in the UI.

### 6.2 Data Transfer — core innovation

**Purpose:** Transfer eligible data to another Zylo customer.

Expected customer flow:
1. Select a friend using a registered Zylo phone number or a searchable friend list.
2. Enter an amount and see the available transferable balance and applicable limits.
3. Confirm recipient, amount, and rules.
4. Process the transfer atomically.
5. Show success/failure and a receipt/history entry to sender and recipient.

Rules:
- Sender and recipient must be valid, eligible Zylo customers and must not be the same account.
- Validate balance, per-transfer limits, daily/monthly limits, and any plan eligibility on the server.
- Never accept a client-provided balance as authoritative.
- Use an atomic transaction/ledger approach so concurrent transfers cannot overspend the balance.
- Prevent duplicate submissions using an idempotency key or equivalent mechanism.
- Record sender, recipient, amount, timestamp, status, and reference.
- The PDF's examples show a 500 MB transfer and a remaining transferable balance. Those are demo examples, not hardcoded values.
- Provide clear validation errors for insufficient balance, invalid recipient, limit exceeded, or ineligible plan.

### 6.3 Data Quest — behaviour-aware quests, XP, badges, and rewards

**Purpose:** Turn data usage and useful account actions into achievements. The PDF's flow is: customer views a quest board → performs an action → backend verifies an event → quest progress updates → XP is awarded → badge may unlock → reward becomes available → profile is updated.

Build a small **rules engine**. Do not show the same fixed quests to every user regardless of behaviour.

Example quest rules:
- Customer rarely saves data → suggest “Save your first 250 MB”.
- Customer regularly uses Data Bank → suggest “Build a 1 GB reserve”.
- Customer has never transferred data → suggest “Send data to a friend”.
- Customer uses Data Bank consistently → suggest a streak or consistency quest.
- More examples can be configured by admins without rewriting the frontend.

Required behaviour:
- Show active and completed quests, progress, requirements, reward/XP, and expiry where applicable.
- Define quest rules/configuration as data, not UI-only conditionals.
- Generate or assign quests based on relevant user events and history.
- Verify completion on the backend from trusted events. Do not let a customer submit `completed: true`.
- Use idempotent event processing so one action cannot repeatedly grant XP or rewards.
- Maintain XP ledger/history and derive the displayed total from ledger entries or an equivalently auditable model.
- Support levels and badges, with clear unlock conditions.
- Make rewards explicit and redeemable/claimable only when eligible. Do not imply monetary value unless the reward actually has it.
- Notify the customer when a quest completes or a badge/reward unlocks.
- Add an admin interface for creating/editing/deactivating quest definitions, setting XP/rewards, and reviewing analytics when feasible.

Possible trusted events include `DATA_SAVED`, `DATA_REDEEMED`, `DATA_TRANSFERRED`, `DATA_RECEIVED`, and `RECHARGE_SUCCEEDED`. Use the project's naming conventions if they already exist.

### 6.4 Data Loan — optional innovation

The PDF illustrates borrowing a data amount when the customer's daily data is finished, then repaying it over time from unused data. The example flow includes choosing an amount, confirming the loan, a loan status dashboard, and automatic repayment.

If implemented:
- Show the available borrow amounts and loan terms before confirmation.
- Validate that the customer has an active plan, has not exceeded the configured number of loans, and is within the configured maximum amount.
- Create a loan record and ledger entries; do not merely increase the dashboard data display.
- Track principal, outstanding amount, due date, status, repayment transactions, and any configured charges.
- Repay only according to the configured rule. The PDF example repays borrowed data from unused data and returns surplus to Data Bank.
- Handle partial repayment, full repayment, overdue status, and failed scheduled processing.
- Use a scheduled job for automated repayment/overdue processing where supported.
- Make terms transparent and avoid suggesting that a simulated loan affects a real mobile network.
- The PDF's 500 MB example and seven-day due period are illustrative defaults, not mandatory hardcoded values.

### 6.5 Number Parking — optional innovation

The PDF describes parking an existing number for 15 or 30 days, with payment, status/expiry management, and a limited number of extensions. It applies to Normal SIM and Business SIM.

If implemented:
- Validate number ownership and eligibility before offering parking.
- Allow configured parking periods and show the price and processing fee before payment.
- Confirm parking only after payment succeeds.
- Track start date, expiry date, extension count, payment history, and status.
- Allow extensions only within configured limits; reject extensions beyond the maximum.
- Provide a Number Vault page for status, expiry, extension, receipts, and reactivation options.
- Treat the PDF's sample prices (₹29 for 15 days and ₹49 for 30 days) and maximum two extensions as demo defaults, configurable through admin settings.
- Do not claim that a parked number is disconnected from a real carrier because no carrier integration is assumed.

### 6.6 Business SIM — optional innovation

The PDF describes a separate Business SIM onboarding journey:
1. Choose Business SIM.
2. Enter business details.
3. Upload business documents.
4. Submit for verification.
5. Show verification status and, once approved, business identity on incoming-call UI mockups.

If implemented:
- Keep Normal SIM and Business SIM as distinct product types.
- Collect only the minimum required demo fields, such as business name, type, optional GST number, and address.
- Support document upload only through a safe storage integration with file type/size validation and access restrictions. Do not store sensitive documents in a public bucket.
- Model verification as `draft`, `submitted`, `under_review`, `approved`, or `rejected`, with reviewer notes and timestamps as appropriate.
- Admins must review and update verification status.
- Do not claim real government/business verification unless an actual trusted verification service exists.
- The incoming-call business identity is a UI/demo concept, not a feature that can alter native phone calls from a website.

### 6.7 Travel Connect / eSIM — optional concept

The PDF describes choosing a destination and travel dates, selecting a travel eSIM package, purchasing it, receiving a QR code/instructions, installing it before travel, and connecting via automatic or manual SIM selection.

If implemented:
- Make it a travel eSIM product catalogue with destination, validity dates, data allowance, price, and purchase state.
- Show setup instructions and a demo QR/activation artefact only when the application can safely generate one.
- Never fabricate a valid carrier activation code or claim an eSIM is installed/connected.
- Clearly label installation and network switching as simulated/manual guidance unless a real eSIM provider integration is configured.
- Do not promise automatic country/network switching from a web application alone.

## 7. Admin modules

### Dashboard
- Aggregate counts and revenue from stored records, with clear definitions and time ranges.
- Separate successful payments from pending/failed payments.
- Use empty states when there is no data. Do not invent production metrics.

### Customer management
- Search/filter customers.
- View account, SIMs, plan, orders, and support history according to admin permissions.
- Suspend/reactivate with reason, confirmation, and audit entry.

### SIM and number management
- Add numbers to inventory, assign statuses, and prevent duplicate allocations.
- View number/SIM lifecycle and customer assignment.
- Keep status transitions validated.

### Plan management
- Create/edit/disable plans.
- Validate price, validity, data allowance, and benefits.
- Prevent disabled plans from being purchased in new checkouts.

### Orders and payments
- Search orders and payment records.
- Show payment provider reference and status.
- Do not let admins manually mark an order paid without a trusted verified process or explicit, audited demo-only action.

### Support management
- View, assign, respond to, and resolve tickets.
- Preserve ticket status history.

### Innovation settings
When the relevant feature is implemented, expose safe configuration for Data Bank caps/expiry, transfer limits, quest definitions/rewards, Data Loan rules, Number Parking durations/prices/extensions, and Business SIM verification workflow. Validate configuration changes and audit admin edits.

## 8. Suggested domain entities

Adapt these to the current database and ORM; do not create duplicate tables if equivalent models already exist.

- `User` / `CustomerProfile`
- `Role` or trusted role claim
- `Sim` / `Connection`
- `PhoneNumberInventory`
- `Plan`
- `Order`
- `Payment`
- `Recharge`
- `UsageRecord` (simulated usage)
- `DataBankAccount` or a derived balance plus `DataBankLot`
- `DataBankTransaction` / ledger
- `DataTransfer`
- `Friend` / contact relationship if the product needs one
- `SupportTicket` and `SupportTicketEvent`
- `QuestDefinition`
- `UserQuest` / quest progress
- `DomainEvent` or event-processing record
- `XpLedger`
- `Achievement` / `UserAchievement`
- `Reward` / `RewardRedemption`
- Optional: `DataLoan`, `LoanTransaction`, `NumberParking`, `BusinessProfile`, `BusinessVerification`, `TravelEsimOrder`
- `AuditLog`
- `Notification`

Use foreign keys/references, indexes, uniqueness constraints, timestamps, and status enums appropriate to the existing database. Store money as integer minor units (paise) where practical, or use a precise decimal type. Store data amounts in a consistent base unit such as MB/bytes and convert only at the UI boundary. Document rounding rules.

## 9. Architecture guidance

Keep domain rules in server-side services/use cases rather than UI components. A sensible separation is:

- Authentication/authorization
- Customer/profile service
- SIM and number inventory service
- Plan/order/payment service
- Usage simulation service
- Data Bank service
- Data Transfer service
- Quest/event-processing service
- XP/achievement/reward service
- Support service
- Admin/reporting service
- Optional innovation services (Data Loan, Number Parking, Business SIM, Travel Connect)

For event-driven features:
1. A trusted business operation succeeds.
2. The server records the operation and its domain event atomically where possible.
3. An idempotent event processor evaluates relevant quest rules.
4. Quest progress and XP/reward ledger entries are updated once.
5. Notifications are created.
6. The customer UI reads persisted progress and displays it.

A queue or Redis/BullMQ worker is optional for a demo. A reliable database-backed event/outbox table and scheduled worker can be used if that better fits the repository. Do not introduce infrastructure without a clear need.

## 10. UI/UX expectations

- Professional telecom brand presentation for Zylo, with a consistent primary/secondary/accent palette derived from existing design tokens.
- Responsive customer and admin layouts.
- Clear navigation and page titles; avoid overcrowded dashboards.
- Distinct customer and admin shells.
- Useful skeleton/loading, empty, error, success, and confirmation states.
- Accessible form labels, keyboard navigation, focus indicators, and sufficient contrast.
- Confirm destructive actions and consequential transfers/claims.
- Show money in INR (₹) and data units consistently.
- Use real application state/API responses, not static arrays masquerading as backend functionality.
- Make all visible buttons work. If a feature is not implemented, mark it as coming soon or omit the action instead of leaving a dead button.
- Avoid unnecessary animation and excessive gradients. Visual polish must not undermine readability or functionality.

## 11. API and validation expectations

Follow the existing API conventions. Example capability groups, not mandatory route names:

- Auth/profile
- Plans and number inventory
- SIM purchase and activation status
- Checkout/webhooks/recharge history
- Usage and Data Bank
- Data transfers
- Quests, progress, XP, achievements, and rewards
- Support tickets
- Admin customers, SIMs, plans, orders, tickets, and innovation configuration
- Optional Data Loan, Number Parking, Business SIM, and Travel Connect

For every mutation:
- Authenticate and authorize.
- Validate input and enforce limits.
- Verify ownership and current state.
- Perform the operation atomically when multiple records/balances change.
- Return a consistent success/error shape.
- Record an audit/ledger entry where relevant.
- Ensure retry-safe/idempotent behaviour for payment webhooks, transfers, quest events, and reward claims.

## 12. Testing checklist

At minimum, test the relevant paths as features are implemented:

### Core
- Customer can register/login/logout.
- Customer cannot access admin routes or another customer's records.
- Number allocation cannot assign one number twice.
- Disabled plans cannot be purchased.
- Plan activation follows verified successful payment only.
- Failed/pending payments do not activate a plan.
- Webhook retries do not duplicate orders, recharges, or activations.

### Data Bank
- Eligible usage is saved once.
- Daily cap and total cap are enforced.
- Redeem cannot exceed available balance.
- Expired lots cannot be redeemed.
- FEFO lot redemption is correct.
- Ledger and visible balance remain consistent.

### Data Transfer
- Invalid recipient, self-transfer, insufficient balance, and limit violations are rejected.
- Concurrent transfers cannot overdraw the sender.
- Duplicate requests do not duplicate transfers.
- Sender and recipient history is correct.

### Data Quest
- Quest selection reflects customer behaviour/rules.
- Only verified backend events count.
- Replayed events do not grant duplicate progress/XP.
- Badge and reward eligibility is checked server-side.
- Reward claims are idempotent.

### Admin and optional features
- Role restrictions are tested.
- Important admin actions create audit records.
- Parking extensions, loan repayments, and verification status transitions respect configured rules.
- File uploads, if present, enforce type/size/access restrictions.

Also run the repository's lint, type-check, test, and production build commands. Report what ran and any remaining failures honestly.

## 13. Delivery priorities

Build in this order unless the current repository already has a different, working sequence:

**Phase 1 — Foundation and core flow**
1. Inspect existing app and write a short implementation/status plan.
2. Authentication and role protection.
3. Customer dashboard and profile.
4. Plans, SIM/number inventory, and purchase flow.
5. Stripe test-mode checkout or clearly labelled development simulator.
6. Transaction history and support tickets.
7. Admin customer, SIM/number, plan, order/payment, and support modules.

**Phase 2 — Main differentiators**
1. Data Bank ledger, lots, save/redeem, and expiry.
2. Data Transfer with atomic balance changes and history.
3. Notifications for important events.

**Phase 3 — Engagement innovation**
1. Domain event recording and idempotent processing.
2. Behaviour-aware quest rules and progress.
3. XP ledger, levels, badges, and reward redemption.
4. Admin quest/reward management and analytics.

**Phase 4 — Optional PDF concepts**
1. Data Loan.
2. Number Parking and Number Vault.
3. Business SIM onboarding and verification.
4. Travel Connect/eSIM catalogue and setup guidance.
5. Broadband and set-top-box services only if time remains.

Do not begin all optional features simultaneously. Finish and test each end-to-end slice before moving to the next.

## 14. Definition of done

A feature is done only when:
- The user can complete its end-to-end flow in the UI.
- Data is persisted and retrieved through the project's intended data layer.
- Server-side validation and authorization are enforced.
- Loading, empty, failure, and success states are handled.
- Sensitive mutations are atomic/idempotent where required.
- Relevant tests or documented manual verification have been completed.
- Lint/type-check/build results are reported.
- Documentation and environment examples are updated where necessary.

## 15. First task for the agent

Start by inspecting the repository and the supplied Zylo Innovation PDF. Summarize:
1. Current stack and architecture.
2. Features already implemented and incomplete.
3. Data models and API routes that already exist.
4. The smallest safe next implementation slice.
5. Any security, data-integrity, or payment risks found.

Then implement only the next agreed slice, without rewriting unrelated code. Treat the PDF as the source for innovation concepts: page 3 covers Data Bank and Data Transfer architecture/rules; page 4 covers Data Quest and XP/rewards; page 5 covers Data Loan; page 1 covers Business SIM; page 2 covers Number Parking; page 6 covers Travel Connect/eSIM.
