import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/lib/db/schema";

const MIGRATION_PATH = path.resolve(
  __dirname,
  "../../drizzle/0000_damp_dorian_gray.sql"
);

/**
 * Spins up a fresh in-memory PGlite instance, applies the REAL generated
 * migration SQL, and returns a drizzle-wrapped db plus a helper to seed users.
 */
export async function makeTestDb() {
  const client = new PGlite();
  await client.waitReady;

  // Apply the real migration. Drizzle separates statements with a
  // `--> statement-breakpoint` marker; PGlite's exec() runs multiple
  // statements per call, so we strip the markers and run the whole file.
  const sql = readFileSync(MIGRATION_PATH, "utf8")
    .split("--> statement-breakpoint")
    .join("\n");
  await client.exec(sql);

  const db = drizzle(client, { schema });

  async function addUser(id: string) {
    await db.insert(schema.users).values({ id }).onConflictDoNothing();
  }

  return { db, addUser };
}
