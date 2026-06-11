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
  it("upserts and reads settings with defaults", async () => {
    const s = await q.getSettings(ctx.db, "u1");
    expect(s.taxSetAsidePercent).toBe(25);
    await q.updateSettings(ctx.db, "u1", { taxSetAsidePercent: 30, currency: "USD" });
    expect((await q.getSettings(ctx.db, "u1")).taxSetAsidePercent).toBe(30);
  });
});
