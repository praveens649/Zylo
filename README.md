# Zylo

## How to demo Data Loan

Zylo Data Loan lets a customer borrow a small amount of data (100 / 250 / 500 MB)
free of charge when their daily data runs out. It is repaid automatically from
new Data Bank deposits, or settled when they next recharge. Everything is
simulated — no real network data is used.

### Rules

- One open loan per SIM (`ACTIVE`, `PARTIALLY_REPAID` or `DUE`).
- A SIM needs an `ACTIVE` plan subscription with `dataBankEnabled = true`
  (plans that can save data are the ones that can repay a loan).
- Limits are server-side constants in `Server/src/loans/loan-rules.ts`:
  max **500 MB** per loan, **2** loans per calendar month (IST), due in **7** days.
- Borrowed data is the loan record itself — it is *not* credited into the Data
  Bank balance (otherwise repayment would immediately take it back).

### Setup

```bash
# Server/.env — optional flags
LOAN_JOBS_ENABLED=true    # hourly due-date/settlement sweep (default on)
ALLOW_DEMO_JOBS=true      # enables POST /admin/jobs/loan-nightly (demo only)
```

No schema migration is needed — `DataLoan` / `DataLoanTransaction` already
exist in `prisma/schema.prisma`.

### Demo script

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

### Endpoints

| Endpoint | Role |
|---|---|
| `GET /api/v1/loans/eligibility?simId=` | customer |
| `POST /api/v1/loans` (`Idempotency-Key` header) | customer |
| `GET /api/v1/loans?simId=` | customer |
| `GET /api/v1/loans/active?simId=` | customer |
| `GET /api/v1/admin/loans` · `/summary` · `/:id` | super admin |
| `POST /api/v1/admin/loans/:id/cancel` | super admin |
| `POST /api/v1/admin/jobs/loan-nightly?asOf=` | super admin + `ALLOW_DEMO_JOBS` |

All eligibility, ownership, and limit checks are enforced server-side;
repeated requests with the same `Idempotency-Key` return the same loan.
