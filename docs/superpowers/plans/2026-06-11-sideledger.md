# sideledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a free, login-backed income/expense tracker for freelancers and side-hustlers, showing net profit, tax set-aside, month-over-month trends, and charts.

**Architecture:** Single Next.js App Router app. Auth.js (GitHub + Google OAuth) with a Drizzle adapter on Neon Postgres. All money stored as integer cents. Pure, unit-tested finance/money modules; a per-user-scoped Drizzle query layer tested against in-memory PGlite; mutations via Server Actions. Server Components read data and render; one client component holds the month selector and the add/edit dialog.

**Tech Stack:** Next.js (App Router) · TypeScript · Auth.js (NextAuth) · Drizzle ORM · Neon Postgres · Tailwind CSS v4 · shadcn/ui · Recharts · Framer Motion · Zod · Vitest + PGlite

> **IMPORTANT (Next.js):** This Next.js may differ from training data. Before writing any Next.js-specific code (Server Actions, route handlers, middleware), read the relevant guide in `node_modules/next/dist/docs/` and heed deprecation notices. See `AGENTS.md`.

> **Commit identity:** All commits use `krunal85 <kp587372@gmail.com>`. Never add Co-Authored-By Claude. Commit-date backdating range to be confirmed with the owner before execution; until then commit with default dates.

---

## File Structure

```
app/
  layout.tsx                  root layout, fonts, theme
  page.tsx                    landing (signed out) / redirect to /dashboard (signed in)
  dashboard/page.tsx          the app (server component, auth-guarded)
  api/auth/[...nextauth]/route.ts   Auth.js handler
  actions.ts                  Server Actions: add/edit/delete transaction, update settings
  globals.css                 Tailwind v4 + theme tokens
components/
  ui/                         shadcn primitives (card, dialog, button, input, select, table)
  summary-cards.tsx           net profit / income / expenses / tax set-aside (server-rendered props)
  income-expense-chart.tsx    Recharts bar (client)
  category-donut.tsx          Recharts donut (client)
  transaction-table.tsx       list for selected month
  transaction-dialog.tsx      add/edit form (client) -> calls Server Actions
  month-selector.tsx          client; drives the dashboard month
  dashboard-client.tsx        client wrapper holding month state + dialog state
lib/
  money.ts                    cents <-> display; parse input to cents
  categories.ts               fixed income/expense category lists + validation
  finance.ts                  netProfit, totals, taxSetAside, groupByMonth, categoryBreakdown
  validate.ts                 Zod schemas for transaction + settings
  auth.ts                     Auth.js config (providers + Drizzle adapter) + session helper
  db/
    schema.ts                 Drizzle schema (app tables + Auth.js adapter tables)
    index.ts                  Neon db client
    queries.ts                all DB access, every fn takes userId and scopes by it
tests/
  money.test.ts
  categories.test.ts
  finance.test.ts
  validate.test.ts
  queries.test.ts             against PGlite (incl. cross-user isolation)
  helpers/pglite.ts           in-memory Postgres + migration harness for tests
drizzle.config.ts
vitest.config.ts
```

---

## Task 1: Scaffold project, tooling, and CI

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `vitest.config.ts`, `.gitignore`, `.github/workflows/ci.yml`, `AGENTS.md`, `CLAUDE.md`

- [ ] **Step 1: Scaffold Next.js + TypeScript + Tailwind v4**

Run (in `D:/Projects/sideledger`, repo already initialized):
```bash
npx create-next-app@latest . --ts --app --tailwind --eslint --no-src-dir --import-alias "@/*" --use-npm
```
Accept overwriting where prompted only for fresh files; keep the existing `docs/` and `.git/`.

- [ ] **Step 2: Add dependencies**

```bash
npm i drizzle-orm @neondatabase/serverless next-auth@beta @auth/drizzle-adapter recharts framer-motion zod
npm i -D drizzle-kit vitest @electric-sql/pglite @vitejs/plugin-react jsdom
```

- [ ] **Step 3: Add `AGENTS.md` Next.js warning + `CLAUDE.md`**

`AGENTS.md`:
```markdown
# This is NOT the Next.js you know

This version has breaking changes. Read the relevant guide in `node_modules/next/dist/docs/` before writing any Next.js code. Heed deprecation notices.
```
`CLAUDE.md`:
```markdown
@AGENTS.md
```

- [ ] **Step 4: Configure Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: { environment: "node", globals: true },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```
Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`, `"db:generate": "drizzle-kit generate"`, `"db:migrate": "drizzle-kit migrate"`.

- [ ] **Step 5: Add CI workflow**

`.github/workflows/ci.yml` — run `npm ci`, `npm run test`, `npm run build`. No DB/OAuth secrets needed (tests use PGlite; build does not hit DB).

- [ ] **Step 6: Smoke test + commit**

Run: `npm run build`
Expected: build succeeds.
```bash
git add -A && git commit -m "Scaffold Next.js app with Tailwind, Vitest, and CI"
```

---

## Task 2: Money module (`lib/money.ts`) — TDD

**Files:**
- Create: `lib/money.ts`
- Test: `tests/money.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { parseToCents, formatCents } from "@/lib/money";

describe("parseToCents", () => {
  it("parses dollar strings to integer cents", () => {
    expect(parseToCents("12.34")).toBe(1234);
    expect(parseToCents("100")).toBe(10000);
    expect(parseToCents("0.05")).toBe(5);
    expect(parseToCents("1,234.50")).toBe(123450);
  });
  it("rejects invalid or negative input", () => {
    expect(() => parseToCents("abc")).toThrow();
    expect(() => parseToCents("-5")).toThrow();
    expect(() => parseToCents("")).toThrow();
  });
});

describe("formatCents", () => {
  it("formats cents as currency", () => {
    expect(formatCents(1234, "USD")).toBe("$12.34");
    expect(formatCents(0, "USD")).toBe("$0.00");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/money.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/money.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/money.ts tests/money.test.ts && git commit -m "Add money parse/format module"
```

---

## Task 3: Categories module (`lib/categories.ts`) — TDD

**Files:**
- Create: `lib/categories.ts`
- Test: `tests/categories.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { CATEGORIES, isValidCategory } from "@/lib/categories";

describe("categories", () => {
  it("exposes fixed income and expense lists", () => {
    expect(CATEGORIES.income).toContain("Client Work");
    expect(CATEGORIES.expense).toContain("Software/Tools");
  });
  it("validates category against type", () => {
    expect(isValidCategory("income", "Client Work")).toBe(true);
    expect(isValidCategory("income", "Travel")).toBe(false);
    expect(isValidCategory("expense", "Travel")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/categories.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```ts
export const CATEGORIES = {
  income: ["Client Work", "Product Sales", "Tips", "Other"],
  expense: ["Software/Tools", "Equipment", "Fees", "Marketing", "Travel", "Supplies", "Other"],
} as const;

export type TxType = keyof typeof CATEGORIES;

export function isValidCategory(type: TxType, category: string): boolean {
  return (CATEGORIES[type] as readonly string[]).includes(category);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/categories.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/categories.ts tests/categories.test.ts && git commit -m "Add fixed category lists with validation"
```

---

## Task 4: Finance module (`lib/finance.ts`) — TDD

**Files:**
- Create: `lib/finance.ts`
- Test: `tests/finance.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
    expect(taxSetAside(txs, 25)).toBe(30000); // 25% of 120000
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/finance.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/finance.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/finance.ts tests/finance.test.ts && git commit -m "Add pure finance calculation module"
```

---

## Task 5: Validation schemas (`lib/validate.ts`) — TDD

**Files:**
- Create: `lib/validate.ts`
- Test: `tests/validate.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { transactionInputSchema, settingsInputSchema } from "@/lib/validate";

describe("transactionInputSchema", () => {
  const valid = { type: "income", amount: "100.50", date: "2026-06-10", category: "Client Work", source: "Acme", note: "" };
  it("accepts valid input and converts amount to cents", () => {
    const r = transactionInputSchema.parse(valid);
    expect(r.amountCents).toBe(10050);
  });
  it("rejects category that does not match type", () => {
    expect(() => transactionInputSchema.parse({ ...valid, category: "Travel" })).toThrow();
  });
  it("rejects bad amount", () => {
    expect(() => transactionInputSchema.parse({ ...valid, amount: "-5" })).toThrow();
  });
});

describe("settingsInputSchema", () => {
  it("accepts a percent 0-100 and currency code", () => {
    expect(settingsInputSchema.parse({ taxSetAsidePercent: 30, currency: "USD" }).taxSetAsidePercent).toBe(30);
  });
  it("rejects out-of-range percent", () => {
    expect(() => settingsInputSchema.parse({ taxSetAsidePercent: 150, currency: "USD" })).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/validate.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```ts
import { z } from "zod";
import { parseToCents } from "@/lib/money";
import { isValidCategory, type TxType } from "@/lib/categories";

export const transactionInputSchema = z
  .object({
    type: z.enum(["income", "expense"]),
    amount: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    category: z.string().min(1),
    source: z.string().max(120).optional().default(""),
    note: z.string().max(500).optional().default(""),
  })
  .transform((v, ctx) => {
    let amountCents: number;
    try {
      amountCents = parseToCents(v.amount);
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid amount" });
      return z.NEVER;
    }
    if (!isValidCategory(v.type as TxType, v.category)) {
      ctx.addIssue({ code: "custom", message: "Category does not match type" });
      return z.NEVER;
    }
    return { type: v.type, amountCents, date: v.date, category: v.category, source: v.source, note: v.note };
  });

export const settingsInputSchema = z.object({
  taxSetAsidePercent: z.number().int().min(0).max(100),
  currency: z.string().length(3),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/validate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/validate.ts tests/validate.test.ts && git commit -m "Add Zod validation schemas"
```

---

## Task 6: Drizzle schema + db client + migrations

**Files:**
- Create: `lib/db/schema.ts`, `lib/db/index.ts`, `drizzle.config.ts`, `.env.example`

- [ ] **Step 1: Write the schema**

`lib/db/schema.ts` — Auth.js adapter tables (`users`, `accounts`, `sessions`, `verificationTokens`) per `@auth/drizzle-adapter` Postgres reference, plus:
```ts
import { pgTable, serial, integer, text, date, timestamp, char, primaryKey, index } from "drizzle-orm/pg-core";
// ... Auth.js adapter tables here (users defined first) ...

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  date: date("date").notNull(),
  category: text("category").notNull(),
  source: text("source"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ userDateIdx: index("tx_user_date_idx").on(t.userId, t.date) }));

export const settings = pgTable("settings", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  taxSetAsidePercent: integer("tax_set_aside_percent").default(25).notNull(),
  currency: char("currency", { length: 3 }).default("USD").notNull(),
});
```

- [ ] **Step 2: Write db client**

`lib/db/index.ts`:
```ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

- [ ] **Step 3: drizzle.config.ts + .env.example**

```ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```
`.env.example`: `DATABASE_URL=`, `AUTH_SECRET=`, `AUTH_GITHUB_ID=`, `AUTH_GITHUB_SECRET=`, `AUTH_GOOGLE_ID=`, `AUTH_GOOGLE_SECRET=`.

- [ ] **Step 4: Generate migration**

Run: `npm run db:generate`
Expected: a SQL migration appears under `drizzle/`.

- [ ] **Step 5: Verify build + commit**

Run: `npm run build`
Expected: typechecks.
```bash
git add lib/db drizzle drizzle.config.ts .env.example && git commit -m "Add Drizzle schema, db client, and initial migration"
```

---

## Task 7: PGlite test harness + per-user query layer (`lib/db/queries.ts`) — TDD

**Files:**
- Create: `tests/helpers/pglite.ts`, `lib/db/queries.ts`
- Test: `tests/queries.test.ts`

- [ ] **Step 1: Write the PGlite harness**

`tests/helpers/pglite.ts` — spin up `@electric-sql/pglite`, wrap with `drizzle-orm/pglite`, and apply the generated migration SQL from `drizzle/` so tests run the real schema. Export `makeTestDb()` returning a fresh in-memory db and a helper to insert a user row directly.

- [ ] **Step 2: Write the failing test (CRUD + cross-user isolation)**

```ts
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/queries.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement the query layer**

`lib/db/queries.ts` — every function takes `(db, userId, ...)` and includes `eq(transactions.userId, userId)` in the WHERE clause for reads, updates, and deletes:
- `createTransaction(db, userId, input)` → insert, return the row.
- `getTransactionsForMonth(db, userId, month)` → `WHERE userId = ? AND date >= firstOfMonth AND date < firstOfNextMonth` ordered by date desc. Compute month bounds from the `YYYY-MM` string.
- `updateTransaction(db, userId, id, patch)` → update `WHERE id = ? AND userId = ?`, return updated row or `null` if no row matched.
- `deleteTransaction(db, userId, id)` → delete `WHERE id = ? AND userId = ?`, return `true`/`false` by rowCount.
- `getSettings(db, userId)` → select; if none, return defaults `{ taxSetAsidePercent: 25, currency: "USD" }`.
- `updateSettings(db, userId, input)` → upsert (`onConflictDoUpdate` on `userId`).

Type `db` as the union of the Neon and PGlite drizzle instances (a shared `type DB` exported here) so the same functions run in tests and production.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/queries.test.ts`
Expected: PASS (all four, including isolation).

- [ ] **Step 6: Commit**

```bash
git add lib/db/queries.ts tests/helpers/pglite.ts tests/queries.test.ts && git commit -m "Add per-user-scoped query layer with PGlite isolation tests"
```

---

## Task 8: Auth.js config + handler + middleware guard

**Files:**
- Create: `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `middleware.ts`

- [ ] **Step 1: Auth.js config**

`lib/auth.ts` — read `node_modules/next/dist/docs/` and Auth.js v5 beta docs first. Configure `NextAuth` with `DrizzleAdapter(db)`, GitHub and Google providers from env, database sessions. Export `{ handlers, auth, signIn, signOut }`. Export a `requireUserId()` helper that calls `auth()` and throws/redirects if no session.

- [ ] **Step 2: Route handler**

`app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 3: Middleware guard**

`middleware.ts` — protect `/dashboard`; redirect unauthenticated users to `/`. Use the Auth.js middleware pattern from the installed version's docs. Matcher excludes `/api/auth`, static assets.

- [ ] **Step 4: Verify build + commit**

Run: `npm run build`
Expected: build succeeds (env can be empty for build).
```bash
git add lib/auth.ts app/api .gitignore middleware.ts && git commit -m "Add Auth.js OAuth config, handler, and route guard"
```

---

## Task 9: Server Actions (`app/actions.ts`)

**Files:**
- Create: `app/actions.ts`

- [ ] **Step 1: Implement actions**

`app/actions.ts` — `"use server"`. Each action:
1. `const userId = await requireUserId()`.
2. Parse `FormData`/args with the Zod schemas from `lib/validate.ts`; on failure return `{ ok: false, error }`.
3. Call the matching `lib/db/queries.ts` function with `userId`.
4. `revalidatePath("/dashboard")`; return `{ ok: true }`.

Actions: `addTransaction`, `editTransaction`, `deleteTransaction`, `updateSettings`. The edit/delete actions pass the row `id`; ownership is enforced by the query layer's `userId` clause (returns null/false → action returns a not-found error).

- [ ] **Step 2: Verify build + commit**

Run: `npm run build`
Expected: build succeeds.
```bash
git add app/actions.ts && git commit -m "Add Server Actions for transactions and settings"
```

---

## Task 10: Landing page + root layout + theme

**Files:**
- Modify: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`

- [ ] **Step 1: Root layout**

`app/layout.tsx` — Inter font, `<html>` with theme via `prefers-color-scheme`, metadata (title "sideledger", description). Zinc background.

- [ ] **Step 2: Landing page**

`app/page.tsx` — server component. If `await auth()` has a session, `redirect("/dashboard")`. Otherwise render a clean hero: one-line pitch ("Free income & expense tracking for freelancers and side-hustlers"), three feature bullets (net profit, tax set-aside, monthly charts), and "Sign in with GitHub" / "Sign in with Google" buttons calling the `signIn` action. Emerald accent. Footer "not tax advice" note.

- [ ] **Step 3: Verify build + commit**

Run: `npm run build`
```bash
git add app/page.tsx app/layout.tsx app/globals.css && git commit -m "Add landing page, root layout, and theme"
```

---

## Task 11: shadcn/ui primitives + summary cards + transaction table

**Files:**
- Create: `components/ui/*` (card, button, dialog, input, select, table, label), `components/summary-cards.tsx`, `components/transaction-table.tsx`

- [ ] **Step 1: Init shadcn and add primitives**

```bash
npx shadcn@latest init
npx shadcn@latest add card button dialog input select table label
```

- [ ] **Step 2: Summary cards**

`components/summary-cards.tsx` — pure presentational. Props: `{ netProfitCents, incomeCents, expenseCents, taxSetAsideCents, currency }`. Four cards using `formatCents`. Net-profit card text turns red (`text-red-600`) when negative, emerald when positive. Framer Motion card entrance.

- [ ] **Step 3: Transaction table**

`components/transaction-table.tsx` — props: `{ transactions, currency, onEdit, onDelete }`. Columns: date, type (badge), category, source, amount (income green, expense red), actions (edit/delete buttons). Empty state row: "No transactions this month. Add your first one."

- [ ] **Step 4: Verify build + commit**

Run: `npm run build`
```bash
git add components/ && git commit -m "Add UI primitives, summary cards, and transaction table"
```

---

## Task 12: Charts (`income-expense-chart.tsx`, `category-donut.tsx`)

**Files:**
- Create: `components/income-expense-chart.tsx`, `components/category-donut.tsx`

- [ ] **Step 1: Income/expense bar chart**

`components/income-expense-chart.tsx` — `"use client"`. Props: `{ data: { month: string; incomeCents: number; expenseCents: number }[] }` (last 6 months). Recharts `BarChart` with two bars (emerald income, zinc/red expense), `ResponsiveContainer`, tooltip formatting via `formatCents`.

- [ ] **Step 2: Category donut**

`components/category-donut.tsx` — `"use client"`. Props: `{ data: { category: string; amountCents: number }[] }`. Recharts `PieChart` donut with legend; tooltip shows formatted amount and percent. Empty state: a muted "No expenses yet" placeholder.

- [ ] **Step 3: Verify build + commit**

Run: `npm run build`
```bash
git add components/income-expense-chart.tsx components/category-donut.tsx && git commit -m "Add income/expense bar chart and category donut"
```

---

## Task 13: Transaction dialog + month selector + dashboard client wrapper

**Files:**
- Create: `components/transaction-dialog.tsx`, `components/month-selector.tsx`, `components/dashboard-client.tsx`

- [ ] **Step 1: Transaction dialog**

`components/transaction-dialog.tsx` — `"use client"`. Add/edit form in a shadcn `Dialog`. Fields: type (select income/expense — switching resets category options from `CATEGORIES`), amount (text, parsed on submit), date (defaults today), category (select), source, note. Submits to `addTransaction`/`editTransaction` via `useTransition`; shows inline errors from the action result; closes and lets revalidation refresh data on success.

- [ ] **Step 2: Month selector**

`components/month-selector.tsx` — `"use client"`. Prev/next month buttons + label; updates the `?month=YYYY-MM` search param (drives the server component re-fetch).

- [ ] **Step 3: Dashboard client wrapper**

`components/dashboard-client.tsx` — `"use client"`. Holds dialog open/edit state and renders the "Add transaction" button, the `TransactionDialog`, and wires `onEdit`/`onDelete` from the table to the dialog and the `deleteTransaction` action. Receives server-computed data as props.

- [ ] **Step 4: Verify build + commit**

Run: `npm run build`
```bash
git add components/transaction-dialog.tsx components/month-selector.tsx components/dashboard-client.tsx && git commit -m "Add transaction dialog, month selector, and dashboard client wrapper"
```

---

## Task 14: Dashboard page (wire it all together)

**Files:**
- Create: `app/dashboard/page.tsx`

- [ ] **Step 1: Implement the dashboard server component**

`app/dashboard/page.tsx`:
1. `const userId = await requireUserId()` (middleware already guards, this is defense in depth).
2. Read `month` from `searchParams` (default = current month — pass `now` in from a server boundary; do not rely on client time).
3. `const settings = await getSettings(db, userId)`.
4. `const txs = await getTransactionsForMonth(db, userId, month)`.
5. For the bar chart, fetch the last 6 months (a `getMonthlyTotals(db, userId, 6, month)` query — add it to `queries.ts` with a matching PGlite test) and shape into chart data.
6. Compute summary via `lib/finance.ts` (`netProfit`, `totals`, `taxSetAside`, `categoryBreakdown`).
7. Render: header with `MonthSelector`, `SummaryCards`, charts row (`IncomeExpenseChart` + `CategoryDonut`), `DashboardClient` (button + dialog + `TransactionTable`).

- [ ] **Step 2: Add + test `getMonthlyTotals` in queries**

Add the query and a PGlite test asserting it returns 6 month buckets scoped to the user, with income/expense sums per month.
Run: `npx vitest run tests/queries.test.ts`
Expected: PASS.

- [ ] **Step 3: Verify build + full test run + commit**

Run: `npm run build && npm run test`
Expected: build succeeds, all tests green.
```bash
git add app/dashboard lib/db/queries.ts tests/queries.test.ts && git commit -m "Add dashboard page wiring data, summary, charts, and transactions"
```

---

## Task 15: Settings (tax % + currency)

**Files:**
- Create: `components/settings-dialog.tsx`
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Settings dialog**

`components/settings-dialog.tsx` — `"use client"`. Dialog with tax set-aside percent (number 0–100) and currency (select; small fixed list). Submits to `updateSettings`. Add a gear button to the dashboard header to open it. Include the "Set-aside is a simple estimate, not tax advice" note.

- [ ] **Step 2: Verify build + commit**

Run: `npm run build`
```bash
git add components/settings-dialog.tsx app/dashboard/page.tsx && git commit -m "Add settings dialog for tax percent and currency"
```

---

## Task 16: README + deploy

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README**

Cover: what it is, screenshots placeholder, the stack, the three engineering decisions worth explaining (Auth.js OAuth + per-user server-side scoping, integer-cents money handling, PGlite-tested DB layer with cross-user isolation), local setup (env vars, `db:generate`/`db:migrate`), and a "free to run / not tax advice" note.

- [ ] **Step 2: Provision + deploy**

- Create GitHub repo `KP-MobileTechie/sideledger`, push.
- Vercel: import repo, add Neon (Marketplace) → sets `DATABASE_URL`.
- Create GitHub + Google OAuth apps; set `AUTH_*` env vars + `AUTH_SECRET` in Vercel.
- Run `drizzle-kit migrate` against Neon.
- Disable Vercel deployment protection for the public demo.

- [ ] **Step 3: Verify live + commit**

Sign in with GitHub and Google, add income + expense, switch months, confirm charts + tax set-aside, confirm cross-account isolation by signing in as a second account.
```bash
git add README.md && git commit -m "Add README and deployment notes"
```

---

## Self-Review

**Spec coverage:** Stack (T1), money cents (T2), categories (T3), finance math incl. tax set-aside (T4), validation (T5), schema + Auth.js adapter tables (T6), per-user query layer + isolation test (T7), Auth.js OAuth GitHub+Google + guard (T8), Server Actions (T9), landing/auth-gated routes (T10), summary + table + charts/data-viz (T11–T12), add/edit dialog + month selector (T13), dashboard wiring (T14), settings tax%/currency (T15), README explaining auth/scoping/cents + deploy + success criteria (T16). All spec sections map to a task.

**Placeholder scan:** Pure modules (T2–T5, T7 tests) have complete code. UI/auth tasks describe concrete files, props, and behavior with build/commit gates; Next.js- and Auth.js-version-specific code is intentionally deferred to the installed docs per `AGENTS.md` rather than guessed.

**Type consistency:** `amountCents` (int) used everywhere; query functions consistently `(db, userId, ...)`; `CATEGORIES`/`TxType` from `lib/categories.ts` reused in `lib/validate.ts`; `formatCents`/`parseToCents` names consistent across money, UI, and validation; `getTransactionsForMonth`, `getSettings`, `updateSettings`, `getMonthlyTotals` names match between queries, tests, and the dashboard.
