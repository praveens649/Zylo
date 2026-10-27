/**
 * Shared display formatting — money, dates, slot times.
 * Prisma Decimal fields arrive as strings over JSON; `money` normalizes.
 */

export function money(n: string | number | null | undefined): number {
  return n == null ? 0 : typeof n === "number" ? n : Number(n);
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(n: string | number | null | undefined) {
  return inr.format(money(n));
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "10:00 AM – 12:00 PM" */
export function formatSlot(startAt: string, endAt: string) {
  const opts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };
  return `${new Date(startAt).toLocaleTimeString(undefined, opts)} – ${new Date(
    endAt
  ).toLocaleTimeString(undefined, opts)}`;
}
