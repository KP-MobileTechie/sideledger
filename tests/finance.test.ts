import { describe, it, expect } from "vitest";
import { totals, netProfit, taxSetAside, categoryBreakdown, groupByMonth } from "@/lib/finance";

type Tx = { type: "income" | "expense"; amountCents: number; date: string; category: string };

const txs: Tx[] = [
  { type: "income", amountCents: 100000, date: "2026-06-02", category: "Client Work" },
  { type: "income", amountCents: 50000, date: "2026-06-10", category: "Tips" },
  { type: "expense", amountCents: 20000, date: "2026-06-05", category: "Software/Tools" },
  { type: "expense", amountCents: 10000, date: "2026-05-30", category: "Travel" },
];

describe("finance", () => {
  it("sums income and expenses", () => {
    expect(totals(txs)).toEqual({ income: 150000, expense: 30000 });
  });
  it("computes net profit (income - expense)", () => {
    expect(netProfit(txs)).toBe(120000);
  });
  it("computes tax set-aside on net profit only, floored to cents", () => {
    expect(taxSetAside(txs, 25)).toBe(30000);
    expect(taxSetAside([{ type: "expense", amountCents: 5000, date: "2026-06-01", category: "Fees" }], 25)).toBe(0);
  });
  it("breaks down expenses by category", () => {
    expect(categoryBreakdown(txs, "expense")).toEqual([
      { category: "Software/Tools", amountCents: 20000 },
      { category: "Travel", amountCents: 10000 },
    ]);
  });
  it("groups by YYYY-MM", () => {
    const g = groupByMonth(txs);
    expect(g["2026-06"].length).toBe(3);
    expect(g["2026-05"].length).toBe(1);
  });
});
