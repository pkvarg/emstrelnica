import { db } from "@/db";
import { consentDocuments, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function getLatestConsent(
  kind: "gdpr" | "range_rules" | "terms",
  locale: "sk" | "hu",
) {
  const [doc] = await db
    .select()
    .from(consentDocuments)
    .where(and(eq(consentDocuments.kind, kind), eq(consentDocuments.locale, locale)))
    .orderBy(desc(consentDocuments.publishedAt))
    .limit(1);

  return doc ?? null;
}

export async function getLatestConsentVersion(
  kind: "gdpr" | "range_rules" | "terms",
): Promise<string | null> {
  const [doc] = await db
    .select({ version: consentDocuments.version })
    .from(consentDocuments)
    .where(eq(consentDocuments.kind, kind))
    .orderBy(desc(consentDocuments.publishedAt))
    .limit(1);

  return doc?.version ?? null;
}

export async function enforceConsentUpToDate(userId: string, locale: string) {
  const [user] = await db
    .select({
      gdprConsentVersion: users.gdprConsentVersion,
      rangeRulesConsentVersion: users.rangeRulesConsentVersion,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return;

  const latestGdpr = await getLatestConsentVersion("gdpr");
  const latestRules = await getLatestConsentVersion("range_rules");

  if (
    (latestGdpr && user.gdprConsentVersion !== latestGdpr) ||
    (latestRules && user.rangeRulesConsentVersion !== latestRules)
  ) {
    redirect(`/${locale}/suhlas`);
  }
}
