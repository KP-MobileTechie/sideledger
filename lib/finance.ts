type Tx = { type: "income" | "expense"; amountCents: number; date: string; category: string };

export function totals(txs: Tx[]): { income: number; expense: number } {
  return txs.reduce(
    (acc, t) => ({ ...acc, [t.type]: acc[t.type] + t.amountCents }),
    { income: 0, expense: 0 },
  );
}

export function netProfit(txs: Tx[]): number {
  const { income, expense } = totals(txs);
  return income - expense;
}

export function taxSetAside(txs: Tx[], percent: number): number {
  const net = netProfit(txs);
  if (net <= 0) return 0;
  return Math.floor((net * percent) / 100);
}

export function categoryBreakdown(txs: Tx[], type: "income" | "expense") {
  const map = new Map<string, number>();
  for (const t of txs.filter((x) => x.type === type)) {
    map.set(t.category, (map.get(t.category) ?? 0) + t.amountCents);
  }
  return [...map.entries()]
    .map(([category, amountCents]) => ({ category, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents);
}

export function groupByMonth(txs: Tx[]): Record<string, Tx[]> {
  const out: Record<string, Tx[]> = {};
  for (const t of txs) {
    const key = t.date.slice(0, 7);
    (out[key] ??= []).push(t);
  }
  return out;
}
