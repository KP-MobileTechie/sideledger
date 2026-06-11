import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// `neon()` throws synchronously when no connection string is provided, which
// breaks env-independent builds: Next.js evaluates this module while collecting
// page data (e.g. for the Auth.js route handler) with no env set. We must keep
// `db` a real Drizzle instance at module load so `@auth/drizzle-adapter` can
// detect the dialect via `is(db, PgDatabase)` synchronously. So when
// DATABASE_URL is absent we hand `neon()` a syntactically valid placeholder URL
// — no query runs at build time, and any real query at request time requires a
// properly configured DATABASE_URL.
const connectionString =
  process.env.DATABASE_URL ?? "postgres://placeholder:placeholder@localhost:5432/placeholder";

const sql = neon(connectionString);
export const db = drizzle(sql, { schema });
