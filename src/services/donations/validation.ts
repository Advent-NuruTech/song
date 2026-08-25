export const MIN_DONATION_KES = 20;
export const MAX_DONATION_KES = 10_000_000;

export function parseDonationAmount(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < MIN_DONATION_KES || amount > MAX_DONATION_KES) return null;
  return amount;
}
