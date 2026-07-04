import { getTranslations } from "next-intl/server";
import {
  getBookingRequestsBccExtra,
  getContactFormBccExtra,
  isAutopilotEnabled,
  isReminderSmsEnabled,
} from "@/lib/settings";
import { ReminderSmsForm } from "./reminder-sms-form";
import { BookingRecipientsForm } from "./booking-recipients-form";
import { ContactFormSettings } from "./contact-form-settings";
import { AutopilotForm } from "./autopilot-form";
import { Settings } from "lucide-react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";

export default async function AdminSettingsPage() {
  const enabled = await isReminderSmsEnabled();
  const bccExtra = await getContactFormBccExtra();
  const bookingBccExtra = await getBookingRequestsBccExtra();
  const autopilot = await isAutopilotEnabled();
  const t = await getTranslations("settings");

  const adminRows = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      receivesBookingRequests: users.receivesBookingRequests,
      receivesContactForm: users.receivesContactForm,
    })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.status, "active")))
    .orderBy(asc(users.lastName), asc(users.firstName));

  const admins = adminRows.map((a) => ({
    id: a.id,
    name: `${a.firstName} ${a.lastName}`.trim() || a.email,
    email: a.email,
    receivesBookingRequests: a.receivesBookingRequests,
    receivesContactForm: a.receivesContactForm,
  }));

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2">
        <Settings size={22} className="text-amber-500" />
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-100">
          {t("reminderSmsTitle")}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          {t("reminderSmsDescription")}
        </p>

        <div className="mt-4">
          <ReminderSmsForm current={enabled} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-100">
          {t("autopilotTitle")}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          {t("autopilotDescription")}
        </p>

        <div className="mt-4">
          <AutopilotForm current={autopilot} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-100">
          {t("bookingRecipientsTitle")}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          {t("bookingRecipientsDescription")}
        </p>

        <div className="mt-4">
          <BookingRecipientsForm admins={admins} bccExtra={bookingBccExtra} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-100">
          {t("contactFormRecipientsTitle")}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          {t("contactFormRecipientsDescription")}
        </p>

        <div className="mt-4">
          <ContactFormSettings admins={admins} bccExtra={bccExtra} />
        </div>
      </section>
    </div>
  );
}
