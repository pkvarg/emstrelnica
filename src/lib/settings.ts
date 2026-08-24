import { db } from "@/db";
import { appSettings, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";

const SINGLETON_ID = 1;

/**
 * The only lifecycle SMS that can fire at all. When false, the booking
 * reminder is email-only. Phone-change OTP SMS is independent of this flag.
 */
export async function isReminderSmsEnabled(): Promise<boolean> {
  const [row] = await db
    .select({ reminderSmsEnabled: appSettings.reminderSmsEnabled })
    .from(appSettings)
    .where(eq(appSettings.id, SINGLETON_ID))
    .limit(1);

  return row?.reminderSmsEnabled ?? true;
}

export async function setReminderSmsEnabled(
  enabled: boolean,
  updatedBy: string,
): Promise<void> {
  await db
    .insert(appSettings)
    .values({
      id: SINGLETON_ID,
      reminderSmsEnabled: enabled,
      updatedBy,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: { reminderSmsEnabled: enabled, updatedBy, updatedAt: new Date() },
    });
}

export async function getContactFormBccExtra(): Promise<string> {
  const [row] = await db
    .select({ v: appSettings.contactFormBccExtra })
    .from(appSettings)
    .where(eq(appSettings.id, SINGLETON_ID))
    .limit(1);
  return row?.v ?? "";
}

export async function setContactFormBccExtra(
  value: string,
  updatedBy: string,
): Promise<void> {
  const normalized = value.trim() || null;
  await db
    .insert(appSettings)
    .values({
      id: SINGLETON_ID,
      contactFormBccExtra: normalized,
      updatedBy,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: {
        contactFormBccExtra: normalized,
        updatedBy,
        updatedAt: new Date(),
      },
    });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseBccList(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && EMAIL_RE.test(s));
}

export async function isAutopilotEnabled(): Promise<boolean> {
  const [row] = await db
    .select({ v: appSettings.autopilotEnabled })
    .from(appSettings)
    .where(eq(appSettings.id, SINGLETON_ID))
    .limit(1);
  return row?.v ?? false;
}

export async function setAutopilotEnabled(
  enabled: boolean,
  updatedBy: string,
): Promise<void> {
  await db
    .insert(appSettings)
    .values({
      id: SINGLETON_ID,
      autopilotEnabled: enabled,
      updatedBy,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: { autopilotEnabled: enabled, updatedBy, updatedAt: new Date() },
    });
}

/**
 * When true (default), a booking without guest or admin check-in is
 * auto-marked as no-show 15 minutes after start. When false, the sweep is
 * skipped and the booking simply auto-completes at end time.
 */
export async function isAutoNoshowEnabled(): Promise<boolean> {
  const [row] = await db
    .select({ v: appSettings.autoNoshowEnabled })
    .from(appSettings)
    .where(eq(appSettings.id, SINGLETON_ID))
    .limit(1);
  return row?.v ?? true;
}

export async function setAutoNoshowEnabled(
  enabled: boolean,
  updatedBy: string,
): Promise<void> {
  await db
    .insert(appSettings)
    .values({
      id: SINGLETON_ID,
      autoNoshowEnabled: enabled,
      updatedBy,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: { autoNoshowEnabled: enabled, updatedBy, updatedAt: new Date() },
    });
}

export async function getBookingRequestsBccExtra(): Promise<string> {
  const [row] = await db
    .select({ v: appSettings.bookingRequestsBccExtra })
    .from(appSettings)
    .where(eq(appSettings.id, SINGLETON_ID))
    .limit(1);
  return row?.v ?? "";
}

export async function setBookingRequestsBccExtra(
  value: string,
  updatedBy: string,
): Promise<void> {
  const normalized = value.trim() || null;
  await db
    .insert(appSettings)
    .values({
      id: SINGLETON_ID,
      bookingRequestsBccExtra: normalized,
      updatedBy,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: {
        bookingRequestsBccExtra: normalized,
        updatedBy,
        updatedAt: new Date(),
      },
    });
}

/**
 * Extra (info-only) recipients for booking request notifications.
 * De-duplicated (case-insensitive). Admins flagged `receivesBookingRequests`
 * get personalized emails separately and are excluded from this list.
 */
export async function getBookingRequestsExtraRecipients(): Promise<string[]> {
  const raw = await getBookingRequestsBccExtra();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of parseBccList(raw)) {
    const key = e.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(e);
    }
  }
  return out;
}

/**
 * Full BCC list for the contact form: emails of admins flagged
 * `receivesContactForm` plus any extra addresses configured in app_settings.
 * De-duplicated (case-insensitive). Empty array means "fall back to Hono env default".
 */
export async function getContactFormBccList(): Promise<string[]> {
  const [adminRows, extraRaw] = await Promise.all([
    db
      .select({ email: users.email })
      .from(users)
      .where(
        and(
          eq(users.role, "admin"),
          eq(users.status, "active"),
          eq(users.receivesContactForm, true),
        ),
      ),
    getContactFormBccExtra(),
  ]);

  const all = [...adminRows.map((r) => r.email), ...parseBccList(extraRaw)];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of all) {
    const key = e.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(e);
    }
  }
  return out;
}
