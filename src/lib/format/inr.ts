const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatInrFromDecimalString(value: string | number): string {
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return inrFormatter.format(n);
}
