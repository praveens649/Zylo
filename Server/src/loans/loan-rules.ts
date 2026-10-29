import type { Prisma } from '../generated/prisma/client.js';
import type { DataLoanStatus } from '../generated/prisma/enums.js';

export type Tx = Prisma.TransactionClient;

/** Statuses that count as an open (unresolved) loan — one per SIM at a time. */
export const OPEN_LOAN_STATUSES: DataLoanStatus[] = [
  'ACTIVE',
  'PARTIALLY_REPAID',
  'DUE',
];

/** Business timezone for cycle/month boundaries and deterministic refs. */
export const TIME_ZONE = 'Asia/Kolkata';
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // fixed +05:30, no DST

/**
 * Loan terms are demo defaults — the schema has no plan-level loan
 * settings, so every Data Bank–enabled plan shares these values.
 */
export const LOAN_LIMIT_MB = 500;
export const LOAN_DUE_DAYS = 7;
export const LOAN_MIN_MB = 100;
export const LOAN_STEP_MB = 50;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** 'yyyy-mm-dd' for a Date in Asia/Kolkata — used in deterministic refs. */
export function istDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** The UTC instant of 00:00 IST on the 1st of the month containing `date`. */
export function istMonthStart(date: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return new Date(
    Date.UTC(Number(get('year')), Number(get('month')) - 1, 1) - IST_OFFSET_MS,
  );
}

/** Short 'd Mon' label for customer-facing due dates, e.g. "5 Nov". */
export function istShortDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function notify(
  tx: Pick<Tx, 'notification'>,
  userId: string,
  title: string,
  message: string,
) {
  return tx.notification.create({ data: { userId, title, message } });
}

/** Deterministic ledger references — replays hit the unique index, never double-apply. */
export const loanRefs = {
  issue: (simId: string, idempotencyKey: string) =>
    `loan-issue:${simId}:${idempotencyKey}`,
  bankRepay: (loanId: string, depositTxnId: string) =>
    `loan-repay:${loanId}:${depositTxnId}`,
  nightlyRepay: (loanId: string, asOf: Date) =>
    `loan-nightly:${loanId}:${istDateKey(asOf)}`,
  settle: (loanId: string, orderId: string) =>
    `loan-settle:${loanId}:${orderId}`,
  cancel: (loanId: string) => `loan-cancel:${loanId}`,
};

/** True when an error is a Prisma unique-constraint violation (P2002). */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: string }).code === 'P2002'
  );
}
