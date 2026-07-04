import { getLocale, getTranslations } from "next-intl/server";
import { getTokenDetails } from "./actions";
import { DecideForm } from "./decide-form";
import { fmtDate, fmtTime } from "@/lib/format";

export default async function DecidePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const details = await getTokenDetails(token);
  const t = await getTranslations("admin");
  const locale = await getLocale();

  if (!details) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-red-600">{t("decide.invalidLink")}</p>
      </div>
    );
  }

  if (details.used) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-zinc-600">{t("decide.linkUsed")}</p>
      </div>
    );
  }

  if (details.expired) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-red-600">{t("decide.linkExpired")}</p>
      </div>
    );
  }

  if (details.booking.status !== "requested") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-zinc-600">
          {details.booking.status === "approved"
            ? t("decide.alreadyApproved")
            : t("decide.alreadyProcessed")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-6">
        <h1 className="text-2xl font-bold">
          {details.action === "approve" ? t("decide.approveTitle") : t("decide.declineTitle")}
        </h1>

        <div className="rounded-lg border p-4 text-sm">
          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt className="text-zinc-500">{t("columns.member")}</dt>
              <dd>{details.member.firstName} {details.member.lastName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">{t("columns.email")}</dt>
              <dd>{details.member.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">{t("columns.range")}</dt>
              <dd>{details.booking.rangeId}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">{t("columns.date")}</dt>
              <dd>{fmtDate(details.booking.startsAt, locale)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">{t("columns.time")}</dt>
              <dd>
                {fmtTime(details.booking.startsAt, locale)}
                {" - "}
                {fmtTime(details.booking.endsAt, locale)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">{t("columns.guests")}</dt>
              <dd>{details.booking.guestCount}</dd>
            </div>
            {details.booking.userNote && (
              <div className="flex justify-between">
                <dt className="text-zinc-500">{t("columns.note")}</dt>
                <dd>{details.booking.userNote}</dd>
              </div>
            )}
          </dl>
        </div>

        <DecideForm token={token} action={details.action} />
      </div>
    </div>
  );
}
