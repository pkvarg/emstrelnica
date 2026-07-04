"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { consentDocuments } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { and, eq } from "drizzle-orm";

export async function publishConsentDocument(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const t = await getTranslations("consent");

  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: t("unauthorized") };
  }

  const kind = formData.get("kind") as string;
  const version = (formData.get("version") as string)?.trim();
  const locale = formData.get("locale") as string;
  const contentMd = formData.get("contentMd") as string;

  if (!kind || !version || !locale || !contentMd) {
    return { error: t("allFieldsRequired") };
  }

  const [clash] = await db
    .select({ version: consentDocuments.version })
    .from(consentDocuments)
    .where(
      and(
        eq(consentDocuments.kind, kind as "gdpr" | "range_rules" | "terms"),
        eq(consentDocuments.locale, locale as "sk" | "hu"),
        eq(consentDocuments.version, version),
      ),
    )
    .limit(1);
  if (clash) {
    return { error: t("versionExists", { version }) };
  }

  await db.insert(consentDocuments).values({
    kind: kind as "gdpr" | "range_rules" | "terms",
    version,
    locale: locale as "sk" | "hu",
    contentMd,
    publishedAt: new Date(),
    publishedBy: session.user.id,
  });

  await writeAudit({
    actorUserId: session.user.id,
    action: "publish_consent",
    entityType: "consent_document",
    entityId: `${kind}:${version}:${locale}`,
    after: { kind, version, locale },
  });

  revalidatePath("/admin");
  revalidatePath("/gdpr");
  revalidatePath("/pravidla-strelnice");
  return { success: true };
}
