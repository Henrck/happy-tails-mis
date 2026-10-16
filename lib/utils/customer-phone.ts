// HappyTails customer contact requirement: Philippine mobile numbers.
// Store a normalized 09XXXXXXXXX local-format number in customers.phone_number.
export function normalizeCustomerPhone(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/[^0-9]/g, "");
  if (/^639\d{9}$/.test(digits)) return `0${digits.slice(2)}`;
  if (/^9\d{9}$/.test(digits)) return `0${digits}`;
  return digits;
}
export function hasValidCustomerPhone(value: string | null | undefined): boolean {
  return /^09\d{9}$/.test(normalizeCustomerPhone(value));
}
