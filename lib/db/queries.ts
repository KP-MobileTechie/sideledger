import { and, desc, eq, gte, lt } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { transactions, settings } from "./schema";

/**
 * Shared DB type. Both the Neon (`drizzle-orm/neon-http`) and PGlite
 * (`drizzle-orm/pglite`) drizzle instances are concrete subclasses of
 * `PgDatabase`, so typing the param against this broad base lets the SAME
 * query functions run in production (Neon) and in tests (PGlite).
 */
export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

export type TransactionInput = {
  type: "income" | "expense";
  amountCents: number;
  date: string;
  category: string;
  source: string;
  note: string;
};

export type TransactionPatch = Partial<TransactionInput>;

/** Compute [firstOfMonth, firstOfNextMonth) bounds as YYYY-MM-DD strings. */
function monthBounds(month: string): { start: string; end: string } {
  const [yearStr, monStr] = month.split("-");
  const year = Number(yearStr);
  const mon = Number(monStr); // 1-12
  const start = `${yearStr}-${monStr}-01`;
  const nextYear = mon === 12 ? year + 1 : year;
  const nextMon = mon === 12 ? 1 : mon + 1;
  const end = `${nextYear}-${String(nextMon).padStart(2, "0")}-01`;
  return { start, end };
}

export async function createTransaction(
  db: DB,
  userId: string,
  input: TransactionInput
) {
  const [row] = await db
    .insert(transactions)
    .values({
      userId,
      type: input.type,
      amountCents: input.amountCents,
      date: input.date,
      category: input.category,
      source: input.source,
      note: input.note,
    })
    .returning();
  return row;
}

export async function getTransactionsForMonth(
  db: DB,
  userId: string,
  month: string
) {
  const { start, end } = monthBounds(month);
  return db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, start),
        lt(transactions.date, end)
      )
    )
    .orderBy(desc(transactions.date));
}

/** Build a chronological list of `count` YYYY-MM strings ending at `anchor` (inclusive). */
function monthList(anchor: string, count: number): string[] {
  const [yearStr, monStr] = anchor.split("-");
  let year = Number(yearStr);
  let mon = Number(monStr); // 1-12
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(`${year}-${String(mon).padStart(2, "0")}`);
    mon -= 1;
    if (mon === 0) {
      mon = 12;
      year -= 1;
    }
  }
  return out.reverse();
}

export async function getMonthlyTotals(
  db: DB,
  userId: string,
  monthsBack: number,
  anchorMonth: string
): Promise<{ month: string; incomeCents: number; expenseCents: number }[]> {
  const months = monthList(anchorMonth, monthsBack);
  const firstMonth = months[0];
  const start = monthBounds(firstMonth).start; // first day of earliest bucket
  const end = monthBounds(anchorMonth).end; // first day of month after anchor

  const rows = await db
    .select({
      type: transactions.type,
      amountCents: transactions.amountCents,
      date: transactions.date,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, start),
        lt(transactions.date, end)
      )
    );

  const buckets = new Map<string, { incomeCents: number; expenseCents: number }>();
  for (const m of months) buckets.set(m, { incomeCents: 0, expenseCents: 0 });

  for (const row of rows) {
    const key = row.date.slice(0, 7); // YYYY-MM
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (row.type === "income") bucket.incomeCents += row.amountCents;
    else bucket.expenseCents += row.amountCents;
  }

  return months.map((month) => ({ month, ...buckets.get(month)! }));
}

export async function updateTransaction(
  db: DB,
  userId: string,
  id: number,
  patch: TransactionPatch
) {
  const [row] = await db
    .update(transactions)
    .set(patch)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .returning();
  return row ?? null;
}

export async function deleteTransaction(
  db: DB,
  userId: string,
  id: number
): Promise<boolean> {
  const deleted = await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .returning({ id: transactions.id });
  return deleted.length > 0;
}

export type Settings = {
  taxSetAsidePercent: number;
  currency: string;
};

export async function getSettings(db: DB, userId: string): Promise<Settings> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, userId));
  if (!row) {
    return { taxSetAsidePercent: 25, currency: "USD" };
  }
  return { taxSetAsidePercent: row.taxSetAsidePercent, currency: row.currency };
}

export async function updateSettings(
  db: DB,
  userId: string,
  input: { taxSetAsidePercent: number; currency: string }
) {
  await db
    .insert(settings)
    .values({ userId, ...input })
    .onConflictDoUpdate({ target: settings.userId, set: input });
}
