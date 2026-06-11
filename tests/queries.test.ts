import { describe, it, expect, beforeEach } from "vitest";
import { makeTestDb } from "./helpers/pglite";
import * as q from "@/lib/db/queries";

let ctx: Awaited<ReturnType<typeof makeTestDb>>;
beforeEach(async () => { ctx = await makeTestDb(); await ctx.addUser("u1"); await ctx.addUser("u2"); });

describe("queries (scoped by userId)", () => {
  it("creates and lists a user's transactions for a month", async () => {
    await q.createTransaction(ctx.db, "u1", { type: "income", amountCents: 10000, date: "2026-06-01", category: "Client Work", source: "", note: "" });
    const rows = await q.getTransactionsForMonth(ctx.db, "u1", "2026-06");
    expect(rows.length).toBe(1);
  });
  it("never returns another user's rows", async () => {
    await q.createTransaction(ctx.db, "u1", { type: "income", amountCents: 10000, date: "2026-06-01", category: "Client Work", source: "", note: "" });
    const rows = await q.getTransactionsForMonth(ctx.db, "u2", "2026-06");
    expect(rows.length).toBe(0);
  });
  it("cannot edit or delete a row owned by another user", async () => {
    const created = await q.createTransaction(ctx.db, "u1", { type: "income", amountCents: 10000, date: "2026-06-01", category: "Client Work", source: "", note: "" });
    const editResult = await q.updateTransaction(ctx.db, "u2", created.id, { amountCents: 1 });
    expect(editResult).toBeNull();
    const delResult = await q.deleteTransaction(ctx.db, "u2", created.id);
    expect(delResult).toBe(false);
    const stillThere = await q.getTransactionsForMonth(ctx.db, "u1", "2026-06");
    expect(stillThere[0].amountCents).toBe(10000);
  });
  it("getMonthlyTotals buckets income/expense per month, chronological, with zeros and isolation", async () => {
    // u1: income in anchor month (2026-06), expense in previous month (2026-05)
    await q.createTransaction(ctx.db, "u1", { type: "income", amountCents: 50000, date: "2026-06-15", category: "Client Work", source: "", note: "" });
    await q.createTransaction(ctx.db, "u1", { type: "expense", amountCents: 12000, date: "2026-05-10", category: "Software/Tools", source: "", note: "" });

    const totals = await q.getMonthlyTotals(ctx.db, "u1", 3, "2026-06");
    expect(totals.map((t) => t.month)).toEqual(["2026-04", "2026-05", "2026-06"]);

    const apr = totals.find((t) => t.month === "2026-04")!;
    expect(apr.incomeCents).toBe(0);
    expect(apr.expenseCents).toBe(0);

    const may = totals.find((t) => t.month === "2026-05")!;
    expect(may.incomeCents).toBe(0);
    expect(may.expenseCents).toBe(12000);

    const jun = totals.find((t) => t.month === "2026-06")!;
    expect(jun.incomeCents).toBe(50000);
    expect(jun.expenseCents).toBe(0);

    // u2 has no rows: identical call returns all-zero buckets (isolation)
    const u2 = await q.getMonthlyTotals(ctx.db, "u2", 3, "2026-06");
    expect(u2.map((t) => t.month)).toEqual(["2026-04", "2026-05", "2026-06"]);
    expect(u2.every((t) => t.incomeCents === 0 && t.expenseCents === 0)).toBe(true);
  });
  it("upserts and reads settings with defaults", async () => {
    const s = await q.getSettings(ctx.db, "u1");
    expect(s.taxSetAsidePercent).toBe(25);
    await q.updateSettings(ctx.db, "u1", { taxSetAsidePercent: 30, currency: "USD" });
    expect((await q.getSettings(ctx.db, "u1")).taxSetAsidePercent).toBe(30);
  });
});
