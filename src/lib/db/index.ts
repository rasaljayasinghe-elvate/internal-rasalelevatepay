import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — point it at your Neon Postgres instance.");
  }
  return drizzle(postgres(connectionString, { max: 1 }), { schema });
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
