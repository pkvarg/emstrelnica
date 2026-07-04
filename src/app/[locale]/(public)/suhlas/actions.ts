"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getLatestConsentVersion } from "@/lib/consent";
import { writeAudit } from "@/lib/audit";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

export async function acceptConsents() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const gdprVersion = await getLatestConsentVersion("gdpr");
  const rulesVersion = await getLatestConsentVersion("range_rules");

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (gdprVersion) {
    patch.gdprConsentVersion = gdprVersion;
    patch.gdprConsentAt = new Date();
  }
  if (rulesVersion) {
    patch.rangeRulesConsentVersion = rulesVersion;
    patch.rangeRulesConsentAt = new Date();
  }

  await db.update(users).set(patch).where(eq(users.id, session.user.id));

  await writeAudit({
    actorUserId: session.user.id,
    action: "re_accept_consents",
    entityType: "user",
    entityId: session.user.id,
    after: { gdprVersion, rulesVersion },
  });

  const locale = await getLocale();
  redirect(session.user.role === "admin" ? `/${locale}/admin` : `/${locale}/app`);
}
