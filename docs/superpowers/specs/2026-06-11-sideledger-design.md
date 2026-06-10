# sideledger — Design Spec

**Date:** 2026-06-11
**Status:** Approved

## What

sideledger is a free income and expense tracker for freelancers and side-hustlers. Sign in, log money in and money out, and see at a glance: net profit, how much to set aside for taxes, this month vs last month, and where the money goes. Data follows you across devices via a real account.

This is the portfolio's authenticated full-stack project: OAuth sign-in, per-user data isolation enforced server-side, Server Actions for mutations, and the portfolio's first data-visualization work (charts).

## Why

- "Needed but no good free fit": the obvious incumbents (QuickBooks Self-Employed and friends) gate the genuinely useful parts behind a paywall. The core a solo earner actually needs — log it, see profit, know the tax set-aside — should be free. (R&D crossed off the saturated freelance-tax-calculator space and the API-cost-heavy review-manager idea; replace-the-spreadsheet income tracking was the surviving underserved, zero-cost gap.)
- Demonstrates skills the portfolio lacks: OAuth auth, per-user authorization, and charts/data-viz.
- Zero running cost to us: free-tier Neon + Auth.js OAuth + Vercel. Deliberately **not Supabase**, to avoid any collision with the splitwisely project being built in parallel.

## Core decisions

1. **Auth.js (NextAuth) with GitHub + Google OAuth** — free, no per-MAU vendor cap. Sessions via the Drizzle adapter. Unauthenticated visitors get a landing page; the app is behind an auth guard.
2. **Neon Postgres + Drizzle ORM** — typed schema, real migrations, PGlite-tested query layer (same proven pattern as linkdeck). No Supabase.
3. **Money as integer cents** — every amount stored as `amountCents` (int). No floats anywhere in the money path.
4. **Server-side per-user scoping** — every query and every Server Action is scoped by the session `userId`. The client is never trusted with row ownership.
5. **Pure, tested finance module** — totals, net profit, tax set-aside, and month-grouping live in `lib/finance.ts` with no DB dependency, so the math is unit-tested in isolation.

## Data model

Auth.js standard adapter tables (`users`, `accounts`, `sessions`, `verification_tokens`) are managed by the adapter. Application tables:

**`transactions`**
| column | type | notes |
|---|---|---|
| id | serial PK | |
| userId | FK → users ON DELETE CASCADE | every row scoped to its owner |
| type | text | `income \| expense` |
| amountCents | integer | always positive; sign implied by `type` |
| date | date | the transaction date (not createdAt) |
| category | text | from a fixed starter list per type |
| source | text NULL | client / gig / payer (income) or vendor (expense) |
| note | text NULL | |
| createdAt | timestamptz | |

**`settings`**
| column | type | notes |
|---|---|---|
| userId | FK → users PK | one row per user |
| taxSetAsidePercent | integer | default 25; 0–100 |
| currency | char(3) | display only, default `USD` |

Indexes: `transactions(userId, date)` composite for the dashboard's month queries; FK index on `transactions.userId`.

Categories (starter, fixed in `lib/categories.ts`): income — Client Work, Product Sales, Tips, Other; expense — Software/Tools, Equipment, Fees, Marketing, Travel, Supplies, Other.

## Routes

| route | kind | behavior |
|---|---|---|
| `/` | page | landing page when signed out (pitch + "Sign in"); redirects to `/dashboard` when signed in. |
| `/dashboard` | server-component page | the app. Summary cards (net profit, income, expenses, tax set-aside), month selector (defaults to current month), monthly income-vs-expense bar chart, expense-by-category donut, and the transaction list for the selected month. Auth-guarded. |
| `/api/auth/[...nextauth]` | route handler | Auth.js OAuth (GitHub + Google). |

Mutations are **Server Actions** (no extra REST routes): `addTransaction`, `editTransaction`, `deleteTransaction`, `updateSettings`. Each re-checks the session, scopes by `userId`, validates input (Zod), and revalidates `/dashboard`. Add/edit happen in a dialog with an inline form.

## Module layout (pure, Vitest-covered)

```
lib/finance.ts      netProfit, totals by type, taxSetAside(percent), groupByMonth, categoryBreakdown — pure, no DB
lib/categories.ts   fixed income/expense category lists + validation
lib/money.ts        cents <-> display formatting (Intl.NumberFormat), parse user input to cents
lib/validate.ts     Zod schemas for transaction + settings input
lib/db/schema.ts    Drizzle schema (app tables + Auth.js adapter tables)
lib/db/queries.ts   all DB access, every function takes userId and scopes by it
lib/auth.ts         Auth.js config (providers, Drizzle adapter, session helper)
```

DB layer tested against PGlite (in-memory Postgres): CRUD plus the critical assertion that one user cannot read or mutate another user's rows. `lib/finance.ts` and `lib/money.ts` unit-tested directly.

## Data flow

- `/dashboard` (Server Component) reads the session, calls `queries.getTransactionsForMonth(userId, month)` and `queries.getSettings(userId)` via Drizzle, computes summary + chart data through `lib/finance.ts`, and renders.
- A client component holds the month selector and the add/edit dialog; submitting calls a Server Action; the action mutates and `revalidatePath('/dashboard')`.

## Error handling

- Invalid amount / missing required field → inline form errors (Zod messages).
- Server Action with no valid session → reject, no mutation (defense in depth behind the route guard).
- Attempt to edit/delete a transaction not owned by the session user → not found, treated identically to a missing row (no ownership oracle).
- DB unreachable → branded error state on the dashboard, never a stack trace.

## UI

Clean SaaS dashboard: zinc neutrals + emerald accent (money/positive), light/dark via `prefers-color-scheme`, Inter font, shadcn/ui cards + dialog + table, Recharts (bar + donut), Framer Motion micro-transitions only (card entrance, dialog). Net-profit card turns red when negative. Mobile-friendly, keyboard/focus accessible. Empty state guides a first-time user to add their first transaction.

## Stack

Next.js (App Router) · TypeScript · Auth.js (NextAuth) · Drizzle ORM · Neon Postgres · Tailwind CSS v4 · shadcn/ui · Recharts · Framer Motion · Vitest + PGlite

## Deployment

GitHub `KP-MobileTechie/sideledger` · CI (Vitest + build; no DB or OAuth secrets needed for tests) · Vercel with Neon Marketplace integration · `drizzle-kit` migrations against Neon · OAuth app credentials (GitHub + Google) set as Vercel env vars.

## Out of scope (v1)

Invoicing, receipt/image upload, recurring transactions, multi-currency conversion (currency is display-only), bank/Plaid import, CSV import/export, multiple businesses per user, team/accountant sharing, paid tiers, actual tax filing or jurisdiction-specific tax math (set-aside is a simple user-set percentage with a clear "not tax advice" note).

## Success criteria

- A user can sign in with GitHub or Google, add income and expenses, switch months, and see correct net profit, tax set-aside, and charts.
- Per-user isolation proven by a PGlite test: user A's queries and mutations never touch user B's rows.
- All finance/money/DB tests green in CI with zero external services.
- Live Vercel URL with working OAuth; README explaining the auth, per-user scoping, and integer-cents decisions.
- $0 running cost: stays within Neon, Auth.js, and Vercel free tiers.
