const peso = new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Philippine peso amount with two decimals: 1500 -> "₱1,500.00". */
export function formatPeso(value: number | string | null | undefined): string {
  const amount = Number(value);
  return `₱${peso.format(Number.isFinite(amount) ? amount : 0)}`;
}
