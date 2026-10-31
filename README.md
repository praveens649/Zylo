# ⚡ Zylo

> A full-stack, enterprise-grade telecom management and digital services ecosystem powering mobile subscriptions, eSIMs, data banking, automated micro-loans, and home digital services.

---

## ✨ Features

- **📱 SIM & Plan Engine**: Real-time management for Physical SIMs & Travel eSIMs (QR generation), supporting Prepaid, Postpaid, Business, and Validity plans.
- **🏦 Data Bank & Data Loans**: Roll over unused daily data or borrow instant zero-fee emergency data (100–500 MB) with automated ledger reconciliation on next recharge/deposit.
- **💳 Payments & Billing**: Complete Stripe integration with webhook-driven subscription life-cycles, invoice generation, and transaction tracking.
- **🏠 Connected Services**: Add-on suite for Fiber Broadband/WiFi, Set-Top Box (IPTV) packages, and integrated Music streaming.
- **👥 Multi-Role Portals**:
  - **Customer Portal**: Self-service usage telemetry, instant recharge, plan switching, and profile management.
  - **Admin Control Center**: System telemetry, subscriber audits, plan curation, job triggers, and loan ledger management.
- **⚡ Enterprise Core**: Built with idempotency keys, rate limiting, distributed caching, and automated cron sweeps.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, Radix UI, Framer Motion |
| **Backend** | NestJS, TypeScript, Prisma ORM, PostgreSQL (Neon), Upstash Redis |
| **Integrations** | Stripe (Payments & Webhooks), Resend (Transactional Email), YouTube API |
| **Tooling** | pnpm workspaces, ESLint, Oxlint, Vitest, Husky |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 20.x
- **pnpm** >= 9.x
- **PostgreSQL** & **Redis**

### Installation

```bash
# 1. Clone repository & install dependencies
pnpm install

# 2. Configure environment variables
cp Server/.env.example Server/.env   # populate database, JWT, and Stripe keys
```

### Database Setup

```bash
# Push schema and seed baseline data
pnpm db:push
pnpm seed
```

1. **Borrow** — sign in as a customer with an active Zylo Max/Ultra plan.
   On the Dashboard or the Data Bank page, open the *Zylo Data Loan* card,
   pick **500 MB** and confirm.
2. **Repay from savings** — on the Data Bank page press *Save to bank*.
   The deposit repays the loan first; the toast shows how much was repaid
   and what remains. The loan status moves `ACTIVE → PARTIALLY_REPAID → REPAID`.
3. **Simulate days passing** — as a super admin open *Data Loans* in the
   sidebar, pick a future date in *Run as of* and press **Run nightly job**.
   Open loans past `dueAt` turn `DUE`; due loans repay from existing bank
   balance. (Requires `ALLOW_DEMO_JOBS=true`; without it the button is hidden.)
4. **Settle on recharge** — with a `DUE` loan open, complete any recharge for
   that SIM. The loan becomes `SETTLED` with a `RECHARGE_REPAYMENT` ledger row.
5. **Inspect** — the admin *Data Loans* page shows summary cards
   (open / due / outstanding / repaid this month), the full ledger per loan
   in the detail dialog, and a **Cancel** action (reason required) that
   writes an `ADJUSTMENT` row and notifies the customer.

### Running Locally

```bash
# Start backend API (http://localhost:5000)
pnpm server

# Start frontend application (http://localhost:3000)
pnpm client
```

---

## 📜 Key Commands

| Command | Action |
|---|---|
| `pnpm client` | Starts the React frontend in development mode |
| `pnpm server` | Runs the NestJS API in watch mode |
| `pnpm db:push` | Synchronizes Prisma schema with PostgreSQL |
| `pnpm seed` | Seeds default administrative accounts |
| `pnpm stripe` | Starts local Stripe webhook listener |
| `pnpm lint` | Runs linters across frontend and backend packages |



