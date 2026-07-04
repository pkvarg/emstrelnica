import { PgBoss } from "pg-boss";

let boss: PgBoss | null = null;

export function getPgBoss(): PgBoss {
  if (!boss) {
    boss = new PgBoss({
      connectionString: process.env.DATABASE_URL!,
      schema: process.env.PGBOSS_SCHEMA || "pgboss",
    });
  }
  return boss;
}

let started = false;

export async function startPgBoss(): Promise<PgBoss> {
  const b = getPgBoss();
  if (!started) {
    await b.start();
    started = true;
  }
  return b;
}
