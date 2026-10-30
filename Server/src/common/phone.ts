/**
 * Normalize a user-entered phone number to the stored E.164 form.
 * Customers type the bare 10-digit number — +91 is added automatically.
 * Also tolerates spaces/dashes and an already-prefixed 91… / +91… input.
 */
export function normalizeIndianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return raw.trim();
}
