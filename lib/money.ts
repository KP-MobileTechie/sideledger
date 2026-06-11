export function parseToCents(input: string): number {
  const cleaned = input.trim().replace(/,/g, "");
  if (cleaned === "" || !/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error("Invalid amount");
  }
  return Math.round(parseFloat(cleaned) * 100);
}

export function formatCents(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}
