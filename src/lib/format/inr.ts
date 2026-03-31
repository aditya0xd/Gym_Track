const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function formatInrFromDecimalString(value: string): string {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return inrFormatter.format(n);
}
