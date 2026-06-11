# sideledger

A free income and expense tracker for freelancers and side-hustlers. Sign in, log money in and money out, and see at a glance your real net profit, how much to set aside for taxes, and where the money goes month by month.

**Live:** https://sideledger.vercel.app

<!-- add demo GIF/screenshot -->

## Features

- **OAuth sign-in** with GitHub and Google: no passwords to manage, data follows you across devices.
- **Log income and expenses by category** with date, source/vendor, and an optional note.
- **At-a-glance summary**: net profit, total income, and total expenses for the selected month.
- **Configurable tax set-aside %**: set your own rate and see the amount to reserve.
- **Month-by-month navigation**: jump between months to review history.
- **Charts**: a monthly income-vs-expense bar chart and an expense-by-category donut.
- **Multi-currency display**: pick a display currency for formatting.
- **Light/dark theme** via `prefers-color-scheme`, no toggle needed.
- **Private per user**: your data is scoped to your account and never visible to anyone else.

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript 5 |
| Auth | Auth.js (NextAuth v5) + Drizzle adapter |
| Database | Neon Postgres + Drizzle ORM |
| Styling | Tailwind CSS v4, shadcn/ui |
| Charts | Recharts 3 |
| Animation | Framer Motion 12 |
| Validation | Zod 4 |
| Testing | Vitest 4 + PGlite (in-memory Postgres) |

## Engineering decisions worth explaining

### Per-user data isolation, enforced server-side

Every database function in [`lib/db/queries.ts`](lib/db/queries.ts) takes a `userId` and scopes its `WHERE` clause to it. Reads filter by `userId`; updates and deletes match on **both** the row `id` *and* the `userId`, so a user can never read or mutate another user's rows: an attempt to touch a row you don't own resolves to "not found," with no ownership oracle. The client is never trusted with row ownership. This guarantee is proven by PGlite tests in [`tests/queries.test.ts`](tests/queries.test.ts), including the explicit cases "never returns another user's rows" and "cannot edit or delete a row owned by another user."

### Money as integer cents

No floats live in the money path. Every amount is stored as an integer `amountCents`, and parsing/formatting happens only at the edges in [`lib/money.ts`](lib/money.ts): `parseToCents` validates and converts user input to an integer, and `formatCents` renders via `Intl.NumberFormat`. This avoids the rounding drift that floating-point arithmetic introduces in financial totals.

### PGlite-tested DB layer

The query and isolation tests run against PGlite, an in-memory Postgres, with the real generated migration applied. Because the same query functions are typed against Drizzle's `PgDatabase` base class, the identical code runs against Neon in production and PGlite in tests. The result: the full test suite runs in CI with **zero external services**, no database connection, and no secrets.

### Auth.js database sessions with the Drizzle adapter

[`lib/auth.ts`](lib/auth.ts) configures NextAuth v5 with the Drizzle adapter and the `database` session strategy. The route guard lives in [`proxy.ts`](proxy.ts) (Next.js 16's `proxy` convention replaces the deprecated `middleware` convention): it wraps the request with `auth()` and redirects unauthenticated visitors away from `/dashboard`. Server Actions independently re-check the session, so authorization is enforced in depth rather than relying on the guard alone.

## Local setup

### Prerequisites

- Node.js 20 or later
- A Neon Postgres database (free tier is fine)
- GitHub and Google OAuth apps

### Steps

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file and fill it in:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | What it is |
   |---|---|
   | `DATABASE_URL` | Your Neon Postgres connection string |
   | `AUTH_SECRET` | A random secret. Generate with `npx auth secret` (or `openssl rand -base64 33`) |
   | `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth app credentials |
   | `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth client credentials |

   When creating the OAuth apps, set the authorized callback URLs to:

   - GitHub: `https://<your-domain>/api/auth/callback/github`
   - Google: `https://<your-domain>/api/auth/callback/google`

   For local development, use `http://localhost:3000` in place of `https://<your-domain>`.

3. Apply the schema to your Neon database. The migration is already generated and committed; run `db:migrate` to apply it. (Use `db:generate` only if you change the schema.)

   ```bash
   npm run db:migrate
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

### Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run test` | Run the test suite |
| `npm run db:generate` | Generate a Drizzle migration from the schema |
| `npm run db:migrate` | Apply migrations to the database |

## Testing

```bash
npm run test
```

Tests run against PGlite (in-memory Postgres) and need **no database connection and no secrets**. They cover the pure finance and money modules and the per-user-scoped query layer, including the isolation guarantees described above.

## Disclaimer

Tax set-aside figures are simple estimates, not tax advice.
