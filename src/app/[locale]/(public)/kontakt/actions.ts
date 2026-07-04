"use server";

import { db } from "@/db";
import { contactBans, contactMessages } from "@/db/schema";
import { notifyContact } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { incrementEmails } from "@/lib/visitors";
import { getClientIp } from "@/lib/ip";
import { headers } from "next/headers";
import { and, eq, or } from "drizzle-orm";

export async function submitContact(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const message = (formData.get("message") as string)?.trim();
  const locale = (formData.get("locale") as string) || "sk";
  const extraOne = formData.get("extraOne") as string;
  const extraTwo = formData.get("extraTwo") as string;
  const timeSpent = parseInt(formData.get("timeSpent") as string, 10) || null;
  const screenSize = (formData.get("screenSize") as string) || null;
  const platform = (formData.get("platform") as string) || null;

  if (
    extraOne !== process.env.NEXT_PUBLIC_EMAIL_EXTRA_ONE ||
    extraTwo !== process.env.NEXT_PUBLIC_EMAIL_EXTRA_TWO
  ) {
    return { success: true };
  }

  if (!name || !email || !message) {
    return { error: "allRequired" };
  }

  const hdrs = await headers();
  const ip = await getClientIp();
  const userAgent = hdrs.get("user-agent") ?? null;
  const referer = hdrs.get("referer") ?? null;
  const acceptLanguage = hdrs.get("accept-language") ?? null;

  const { allowed } = rateLimit(`contact:${ip ?? "unknown"}`, 3, 15 * 60 * 1000);
  if (!allowed) {
    return { success: true };
  }

  const banCandidates = [
    and(eq(contactBans.kind, "email" as const), eq(contactBans.value, email)),
    ...(ip ? [and(eq(contactBans.kind, "ip" as const), eq(contactBans.value, ip))] : []),
  ];
  const bans = await db
    .select({ id: contactBans.id })
    .from(contactBans)
    .where(or(...banCandidates))
    .limit(1);
  if (bans.length > 0) {
    return { success: true };
  }

  let emailSent = false;
  try {
    await notifyContact({ name, email, phone, message, locale });
    emailSent = true;
    incrementEmails().catch(() => {});
  } catch (e) {
    console.error("Contact email send failed:", e);
  }

  await db.insert(contactMessages).values({
    name,
    email,
    phone,
    message,
    locale: locale as "sk" | "hu",
    ip,
    userAgent,
    referer,
    acceptLanguage,
    timeSpent,
    screenSize,
    platform,
    emailSent,
  });

  return { success: true };
}
