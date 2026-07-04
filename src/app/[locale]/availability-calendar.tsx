"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { bratislavaDateStr } from "@/lib/format";

interface DayRange {
  rangeId: string;
  open: boolean;
  startTime: string | null;
  endTime: string | null;
  closed: boolean;
  closureReasonSk: string | null;
  closureReasonHu: string | null;
  bookedSlots: { start: string; end: string }[];
}

interface Day {
  date: string;
  weekday: number;
  ranges: DayRange[];
}

interface Range {
  id: string;
  nameSk: string;
  nameHu: string;
}

interface AvailabilityData {
  ranges: Range[];
  days: Day[];
}

function hourToMin(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
}

interface HourSlot {
  hour: string;
  taken: boolean;
}

function computeHourSlots(dr: DayRange): HourSlot[] {
  if (!dr.open || !dr.startTime || !dr.endTime) return [];
  const startMin = hourToMin(dr.startTime);
  const endMin = hourToMin(dr.endTime);
  const startHour = Math.ceil(startMin / 60);
  const endHour = Math.floor(endMin / 60);
  const slots: HourSlot[] = [];
  for (let h = startHour; h < endHour; h++) {
    const slotStart = h * 60;
    const slotEnd = slotStart + 60;
    const taken = dr.bookedSlots.some((b) => {
      const bs = hourToMin(b.start);
      const be = hourToMin(b.end);
      return bs < slotEnd && be > slotStart;
    });
    slots.push({ hour: `${String(h).padStart(2, "0")}:00`, taken });
  }
  return slots;
}

function formatDay(dateStr: string, locale: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const weekday = date.toLocaleDateString(locale === "hu" ? "hu-HU" : "sk-SK", {
    weekday: "short",
  });
  return `${weekday}, ${date.getDate()}.`;
}

function monthLabel(year: number, month: number, locale: string): string {
  const d = new Date(year, month - 1, 1);
  const label = d.toLocaleDateString(locale === "hu" ? "hu-HU" : "sk-SK", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function isToday(dateStr: string): boolean {
  return dateStr === bratislavaDateStr();
}

function buildBookingHref(
  locale: string,
  isAuthenticated: boolean,
  rangeId: string,
  date: string,
  startTime?: string,
): string {
  const params = new URLSearchParams({ rangeId, date });
  if (startTime) params.set("startTime", startTime);
  const target = `/${locale}/app/rezervacie/nova?${params.toString()}`;
  if (isAuthenticated) return target;
  const loginUrl = `/${locale}/prihlasenie?callbackUrl=${encodeURIComponent(target)}`;
  return loginUrl;
}

export function AvailabilityCalendar() {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [data, setData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;
    fetch(`/api/availability?month=${monthStr}`)
      .then((r) => r.json())
      .then((d: AvailabilityData) => {
        setData(d);
        setLoading(false);
      });
  }, [year, month]);

  function goPrev() {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }

  function goNext() {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }

  const label = useMemo(() => monthLabel(year, month, locale), [year, month, locale]);

  const atOrBeforeCurrentMonth =
    year < today.getFullYear() ||
    (year === today.getFullYear() && month <= today.getMonth() + 1);

  const todayStr = bratislavaDateStr(today);
  const visibleDays = useMemo(
    () => (data?.days ?? []).filter((d) => d.date >= todayStr),
    [data, todayStr],
  );

  return (
    <div>
      <div className="mb-8 flex items-center gap-4">
        <div className="h-px flex-1 bg-zinc-800" />
        <h2 className="font-[family-name:var(--font-bebas)] text-3xl tracking-widest text-zinc-400">
          {t("title")}
        </h2>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      <div className="mb-4 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={goPrev}
          disabled={atOrBeforeCurrentMonth}
          aria-label={t("prev")}
          className="group inline-flex items-center gap-2 rounded-lg border border-amber-600/40 bg-amber-600/10 px-4 py-2 text-sm font-semibold text-amber-500 transition-colors hover:border-amber-500 hover:bg-amber-600/20 hover:text-amber-400 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-amber-600/40 disabled:hover:bg-amber-600/10"
        >
          <ChevronLeft size={28} strokeWidth={2.5} />
          <span className="hidden sm:inline">{t("prev")}</span>
        </button>
        <div className="font-[family-name:var(--font-bebas)] text-2xl tracking-wider text-zinc-100">
          {label}
        </div>
        <button
          type="button"
          onClick={goNext}
          aria-label={t("next")}
          className="group inline-flex items-center gap-2 rounded-lg border border-amber-600/40 bg-amber-600/10 px-4 py-2 text-sm font-semibold text-amber-500 transition-colors hover:border-amber-500 hover:bg-amber-600/20 hover:text-amber-400"
        >
          <span className="hidden sm:inline">{t("next")}</span>
          <ChevronRight size={28} strokeWidth={2.5} />
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-5 text-xs">
        <span className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-600" />
          <span className="text-zinc-400">{t("available")}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-600" />
          <span className="text-zinc-400">{t("booked")}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-zinc-700" />
          <span className="text-zinc-400">{t("closed")}</span>
        </span>
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  {locale === "hu" ? "Dátum" : "Dátum"}
                </th>
                {data.ranges.map((r) => (
                  <th
                    key={r.id}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500"
                  >
                    {locale === "hu" ? r.nameHu : r.nameSk}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleDays.length === 0 ? (
                <tr>
                  <td
                    colSpan={data.ranges.length + 1}
                    className="px-4 py-12 text-center text-sm text-zinc-500"
                  >
                    —
                  </td>
                </tr>
              ) : (
                visibleDays.map((day) => {
                  const today = isToday(day.date);
                  return (
                    <tr
                      key={day.date}
                      className={`border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/30 ${today ? "bg-amber-950/10" : ""}`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-sm font-medium ${today ? "text-amber-500" : "text-zinc-300"}`}>
                          {formatDay(day.date, locale)}
                        </span>
                      </td>
                      {day.ranges.map((dr) => (
                        <td key={dr.rangeId} className="px-4 py-3">
                          <DayCell
                            dr={dr}
                            date={day.date}
                            locale={locale}
                            past={false}
                            t={t}
                            isAuthenticated={isAuthenticated}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface DayCellProps {
  dr: DayRange;
  date: string;
  locale: string;
  past: boolean;
  t: ReturnType<typeof useTranslations>;
  isAuthenticated: boolean;
}

function DayCell({ dr, date, locale, past, t, isAuthenticated }: DayCellProps) {
  if (!dr.open) {
    const reason =
      dr.closed && (locale === "hu" ? dr.closureReasonHu : dr.closureReasonSk);
    return (
      <span className="inline-flex items-center rounded bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-500">
        {reason || t("closed")}
      </span>
    );
  }

  const slots = computeHourSlots(dr);

  if (dr.bookedSlots.length === 0) {
    if (past) {
      return (
        <span className="rounded bg-emerald-600/10 px-2 py-0.5 text-xs font-medium text-emerald-600/60 ring-1 ring-emerald-600/20">
          {t("available")}
        </span>
      );
    }
    return (
      <Link
        href={buildBookingHref(locale, isAuthenticated, dr.rangeId, date)}
        className="inline-block rounded bg-emerald-600/15 px-2 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-600/30 transition-colors hover:bg-emerald-600/25 hover:text-emerald-300"
      >
        {t("available")}
      </Link>
    );
  }

  if (slots.length === 0 || slots.every((s) => s.taken)) {
    return (
      <span className="rounded bg-rose-600/15 px-2 py-0.5 text-xs font-medium text-rose-400 ring-1 ring-rose-600/30">
        {t("booked")}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {slots.map((s) => {
        if (s.taken) {
          return (
            <span
              key={s.hour}
              className="rounded bg-rose-600/15 px-2 py-0.5 text-xs font-mono text-rose-400 ring-1 ring-rose-600/30"
            >
              {s.hour}
            </span>
          );
        }
        return (
          <Link
            key={s.hour}
            href={past ? "#" : buildBookingHref(locale, isAuthenticated, dr.rangeId, date, s.hour)}
            aria-disabled={past}
            className={
              past
                ? "rounded px-2 py-0.5 text-xs font-mono text-zinc-600 ring-1 ring-zinc-800"
                : "rounded bg-emerald-600/15 px-2 py-0.5 text-xs font-mono text-emerald-400 ring-1 ring-emerald-600/30 transition-colors hover:bg-emerald-600/25 hover:text-emerald-300"
            }
          >
            {s.hour}
          </Link>
        );
      })}
    </div>
  );
}
