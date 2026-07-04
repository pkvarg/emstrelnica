import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import argon2 from "argon2";

async function main() {
  const email = process.argv[2];
  const phone = process.argv[3];
  const password = process.argv[4];

  if (!email || !phone || !password) {
    console.error(
      "Usage: npx tsx src/db/seed-admin.ts <email> <phone> <password>",
    );
    process.exit(1);
  }

  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client, { schema });

  const passwordHash = await argon2.hash(password);

  const [user] = await db
    .insert(schema.users)
    .values({
      email,
      phoneE164: phone,
      firstName: "Admin",
      lastName: "Strelnica",
      role: "admin",
      status: "active",
      locale: "sk",
      passwordHash,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
      gdprConsentVersion: "v1",
      gdprConsentAt: new Date(),
      rangeRulesConsentVersion: "v1",
      rangeRulesConsentAt: new Date(),
    })
    .returning({ id: schema.users.id, email: schema.users.email });

  console.log("Admin created:", user);

  await client.end();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
