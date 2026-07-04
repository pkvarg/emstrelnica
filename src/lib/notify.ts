import { db } from "@/db";
import { notificationsLog } from "@/db/schema";
import { getContactFormBccList, isReminderSmsEnabled } from "@/lib/settings";
import crypto from "crypto";

const HONO_URL = process.env.NEXT_PUBLIC_HONO_API_URL || "https://hono.pictusweb.sk";
const API_TOKEN = process.env.STRELNICA_API_TOKEN || "";

export async function callHono(
  endpoint: string,
  payload: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${HONO_URL}/api/strelnica/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    return { success: res.ok, error: data.error };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function logNotification(opts: {
  channel: "email" | "sms";
  to: string;
  template: string;
  locale: string;
  subject?: string;
  body?: string;
  bookingId?: string;
  userId?: string;
  status: "sent" | "failed" | "retrying";
  providerResponse?: unknown;
}) {
  await db.insert(notificationsLog).values({
    channel: opts.channel,
    to: opts.to,
    template: opts.template,
    locale: opts.locale as "sk" | "hu",
    subject: opts.subject ?? null,
    bodyHash: opts.body
      ? crypto.createHash("sha256").update(opts.body).digest("hex")
      : null,
    bookingId: opts.bookingId ?? null,
    userId: opts.userId ?? null,
    status: opts.status as "sent" | "failed" | "retrying",
    providerResponse: opts.providerResponse ?? null,
  });
}

export async function notifyInvitation(opts: {
  email: string;
  firstName: string;
  invitationUrl: string;
  locale: string;
  userId: string;
}) {
  const result = await callHono("invitation", {
    email: opts.email,
    firstName: opts.firstName,
    invitationUrl: opts.invitationUrl,
    locale: opts.locale,
  });

  await logNotification({
    channel: "email",
    to: opts.email,
    template: "invitation",
    locale: opts.locale,
    userId: opts.userId,
    status: result.success ? "sent" : "failed",
    providerResponse: result,
  });

  return result;
}

export async function notifyOtpEmail(opts: {
  email: string;
  code: string;
  purpose: string;
  locale: string;
  userId?: string;
}) {
  const result = await callHono("otp/email", {
    email: opts.email,
    code: opts.code,
    purpose: opts.purpose,
    locale: opts.locale,
  });

  await logNotification({
    channel: "email",
    to: opts.email,
    template: "otp_email",
    locale: opts.locale,
    userId: opts.userId,
    status: result.success ? "sent" : "failed",
    providerResponse: result,
  });

  return result;
}

export async function notifyOtpSms(opts: {
  phone: string;
  code: string;
  purpose: string;
  locale: string;
  userId?: string;
}) {
  const result = await callHono("otp/sms", {
    phone: opts.phone,
    code: opts.code,
    purpose: opts.purpose,
    locale: opts.locale,
  });

  await logNotification({
    channel: "sms",
    to: opts.phone,
    template: "otp_sms",
    locale: opts.locale,
    userId: opts.userId,
    status: result.success ? "sent" : "failed",
    providerResponse: result,
  });

  return result;
}

/**
 * Admin email OTP for login. Email-only; never SMS. Always on regardless of
 * the reminder SMS setting — this is part of admin auth, not lifecycle.
 */
export async function notifyAdminLoginOtp(opts: {
  email: string;
  code: string;
  locale: string;
  userId?: string;
}) {
  const result = await callHono("admin-otp", {
    email: opts.email,
    code: opts.code,
    locale: opts.locale,
  });

  await logNotification({
    channel: "email",
    to: opts.email,
    template: "admin_login_otp",
    locale: opts.locale,
    userId: opts.userId,
    status: result.success ? "sent" : "failed",
    providerResponse: result,
  });

  return result;
}

export async function notifyAdminsBookingRequest(opts: {
  memberName: string;
  memberEmail: string;
  rangeId: string;
  date: string;
  time: string;
  hours: number;
  guestCount: number;
  note: string | null;
  admins: { email: string; firstName?: string | null; approveUrl: string; declineUrl: string }[];
  infoOnlyEmails?: string[];
  autopilot?: boolean;
  locale: string;
  bookingId: string;
}) {
  const { enqueueNotify } = await import("@/lib/jobs/notify-send");
  for (const admin of opts.admins) {
    await enqueueNotify({
      endpoint: "booking-request-admin",
      payload: {
        email: admin.email,
        adminFirstName: admin.firstName ?? null,
        memberName: opts.memberName,
        memberEmail: opts.memberEmail,
        rangeId: opts.rangeId,
        date: opts.date,
        time: opts.time,
        hours: opts.hours,
        guestCount: opts.guestCount,
        note: opts.note,
        approveUrl: opts.autopilot ? "" : admin.approveUrl,
        declineUrl: opts.autopilot ? "" : admin.declineUrl,
        infoOnly: !!opts.autopilot,
        autopilot: !!opts.autopilot,
        locale: opts.locale,
      },
      log: {
        channel: "email",
        to: admin.email,
        template: opts.autopilot
          ? "booking_request_admin_autopilot"
          : "booking_request_admin",
        locale: opts.locale,
        bookingId: opts.bookingId,
      },
    });
  }

  for (const email of opts.infoOnlyEmails ?? []) {
    await enqueueNotify({
      endpoint: "booking-request-admin",
      payload: {
        email,
        memberName: opts.memberName,
        memberEmail: opts.memberEmail,
        rangeId: opts.rangeId,
        date: opts.date,
        time: opts.time,
        hours: opts.hours,
        guestCount: opts.guestCount,
        note: opts.note,
        approveUrl: "",
        declineUrl: "",
        infoOnly: true,
        autopilot: !!opts.autopilot,
        locale: opts.locale,
      },
      log: {
        channel: "email",
        to: email,
        template: opts.autopilot
          ? "booking_request_admin_autopilot"
          : "booking_request_admin_info",
        locale: opts.locale,
        bookingId: opts.bookingId,
      },
    });
  }
}

export async function notifyMemberBookingApproved(opts: {
  email: string;
  memberName: string;
  rangeId: string;
  date: string;
  time: string;
  locale: string;
  bookingId: string;
  userId: string;
  autoApproved?: boolean;
}) {
  const { enqueueNotify } = await import("@/lib/jobs/notify-send");
  await enqueueNotify({
    endpoint: "booking-approved",
    payload: {
      email: opts.email,
      memberName: opts.memberName,
      rangeId: opts.rangeId,
      date: opts.date,
      time: opts.time,
      autoApproved: !!opts.autoApproved,
      locale: opts.locale,
    },
    log: {
      channel: "email",
      to: opts.email,
      template: opts.autoApproved ? "booking_approved_auto" : "booking_approved",
      locale: opts.locale,
      bookingId: opts.bookingId,
      userId: opts.userId,
    },
  });
}

export async function notifyMemberBookingDeclined(opts: {
  email: string;
  memberName: string;
  rangeId: string;
  date: string;
  time: string;
  reason: string | null;
  locale: string;
  bookingId: string;
  userId: string;
}) {
  const { enqueueNotify } = await import("@/lib/jobs/notify-send");
  await enqueueNotify({
    endpoint: "booking-declined",
    payload: {
      email: opts.email,
      memberName: opts.memberName,
      rangeId: opts.rangeId,
      date: opts.date,
      time: opts.time,
      reason: opts.reason,
      locale: opts.locale,
    },
    log: {
      channel: "email",
      to: opts.email,
      template: "booking_declined",
      locale: opts.locale,
      bookingId: opts.bookingId,
      userId: opts.userId,
    },
  });
}

/**
 * Booking reminder — the only lifecycle notification that can send SMS,
 * and only when the `reminder_sms_enabled` admin setting is true.
 */
export async function notifyBookingReminder(opts: {
  email: string;
  phone: string;
  memberName: string;
  rangeId: string;
  date: string;
  time: string;
  checkInUrl: string;
  locale: string;
  bookingId: string;
  userId: string;
}) {
  const { enqueueNotify } = await import("@/lib/jobs/notify-send");
  const smsOn = await isReminderSmsEnabled();
  await enqueueNotify({
    endpoint: "booking-reminder",
    payload: {
      email: opts.email,
      phone: smsOn ? opts.phone : undefined,
      memberName: opts.memberName,
      rangeId: opts.rangeId,
      date: opts.date,
      time: opts.time,
      checkInUrl: opts.checkInUrl,
      locale: opts.locale,
    },
    log: {
      channel: "email",
      to: opts.email,
      template: "booking_reminder",
      locale: opts.locale,
      bookingId: opts.bookingId,
      userId: opts.userId,
    },
  });
}

export async function notifyPasswordReset(opts: {
  email: string;
  firstName: string;
  resetUrl: string;
  locale: string;
  userId?: string;
}) {
  const result = await callHono("password-reset", {
    email: opts.email,
    firstName: opts.firstName,
    resetUrl: opts.resetUrl,
    locale: opts.locale,
  });

  await logNotification({
    channel: "email",
    to: opts.email,
    template: "password_reset",
    locale: opts.locale,
    userId: opts.userId,
    status: result.success ? "sent" : "failed",
    providerResponse: result,
  });

  return result;
}

export async function notifyMemberBookingCancelled(opts: {
  email: string;
  memberName: string;
  rangeId: string;
  date: string;
  time: string;
  cancelledBy: "member" | "admin";
  reason?: string | null;
  locale: string;
  bookingId: string;
  userId: string;
}) {
  const { enqueueNotify } = await import("@/lib/jobs/notify-send");
  await enqueueNotify({
    endpoint: "booking-cancelled",
    payload: {
      email: opts.email,
      memberName: opts.memberName,
      rangeId: opts.rangeId,
      date: opts.date,
      time: opts.time,
      cancelledBy: opts.cancelledBy,
      reason: opts.reason ?? null,
      locale: opts.locale,
    },
    log: {
      channel: "email",
      to: opts.email,
      template: "booking_cancelled",
      locale: opts.locale,
      bookingId: opts.bookingId,
      userId: opts.userId,
    },
  });
}

export async function notifyNoShow(opts: {
  email: string;
  memberName: string;
  rangeId: string;
  date: string;
  locale: string;
  bookingId: string;
  userId: string;
}) {
  const { enqueueNotify } = await import("@/lib/jobs/notify-send");
  await enqueueNotify({
    endpoint: "no-show",
    payload: {
      email: opts.email,
      memberName: opts.memberName,
      rangeId: opts.rangeId,
      date: opts.date,
      locale: opts.locale,
    },
    log: {
      channel: "email",
      to: opts.email,
      template: "no_show",
      locale: opts.locale,
      bookingId: opts.bookingId,
      userId: opts.userId,
    },
  });
}

export async function notifyMembershipReminder(opts: {
  email: string;
  memberName: string;
  year: number;
  locale: string;
  userId: string;
}) {
  const { enqueueNotify } = await import("@/lib/jobs/notify-send");
  await enqueueNotify({
    endpoint: "membership-reminder",
    payload: {
      email: opts.email,
      memberName: opts.memberName,
      year: opts.year,
      locale: opts.locale,
    },
    log: {
      channel: "email",
      to: opts.email,
      template: "membership_reminder",
      locale: opts.locale,
      userId: opts.userId,
    },
  });
}

export async function notifyContact(opts: {
  name: string;
  email: string;
  phone: string | null;
  message: string;
  locale: string;
}) {
  const bcc = await getContactFormBccList();

  const result = await callHono("contact", {
    name: opts.name,
    email: opts.email,
    phone: opts.phone,
    message: opts.message,
    locale: opts.locale,
    bcc,
  });

  await logNotification({
    channel: "email",
    to: bcc.length > 0 ? bcc.join(", ") : "admin",
    template: "contact",
    locale: opts.locale,
    status: result.success ? "sent" : "failed",
    providerResponse: result,
  });

  return result;
}
