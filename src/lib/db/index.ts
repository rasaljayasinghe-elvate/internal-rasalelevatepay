import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — point it at your Neon Postgres instance.");
  }
  // prepare: false is required for Neon's pooled connections (PgBouncer).
  // Direct connections work with it too.
  return drizzle(postgres(connectionString, { max: 1, prepare: false }), { schema });
}

/** Turn a failed query into a short message safe to show in the UI. */
export function databaseErrorMessage(err: unknown): string {
  console.error(err);
  const text = collectErrorText(err);
  if (text.includes("DATABASE_URL is not set")) {
    return "DATABASE_URL is not set, so this page cannot read the database.";
  }
  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|Connection terminated|could not connect|connect E/i.test(text)) {
    return "The database is not reachable. Check that Postgres is running and DATABASE_URL is correct.";
  }
  return "This page could not load data from the database.";
}

function collectErrorText(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) {
    const extra =
      err instanceof AggregateError
        ? err.errors.map(collectErrorText).join(" ")
        : collectErrorText((err as { cause?: unknown }).cause);
    return `${err.message} ${err.name} ${extra}`;
  }
  if (typeof err === "object" && "code" in err) {
    return String((err as { code?: unknown }).code ?? "");
  }
  return String(err);
}

type Db = ReturnType<typeof createDb>;
let instance: Db | undefined;

// Connected on first use so `next build` can load route modules without a database.
export const db = new Proxy({} as Db, {
  get(_, prop) {
    instance ??= createDb();
    return Reflect.get(instance, prop, instance);
  },
});

export { schema };
