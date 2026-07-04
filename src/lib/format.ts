const SK = "sk-SK";
export const BRATISLAVA_TZ = "Europe/Bratislava";

type LocaleArg = string | "sk" | "hu" | null | undefined;
const resolveLocale = (locale?: LocaleArg): string => {
  if (!locale) return SK;
  if (locale === "hu") return "hu-HU";
  if (locale === "sk") return SK;
  return locale;
};

export function fmtDate(d: Date | string | null | undefined, locale?: LocaleArg): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(resolveLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: BRATISLAVA_TZ,
  });
}

export function fmtDateTime(d: Date | string | null | undefined, locale?: LocaleArg): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString(resolveLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: BRATISLAVA_TZ,
  });
}

export function fmtTime(d: Date | string | null | undefined, locale?: LocaleArg): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString(resolveLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: BRATISLAVA_TZ,
  });
}

/**
 * Returns the local Bratislava wall-clock date as "YYYY-MM-DD", regardless of
 * the runtime's configured TZ. Use this instead of `.toISOString().split("T")[0]`
 * whenever the string must reflect what a Bratislava user calls "today".
 */
export function bratislavaDateStr(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRATISLAVA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value ?? "";
  const m = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${y}-${m}-${day}`;
}

/**
 * Returns Bratislava wall-clock time as "HH:mm". Independent of the runtime TZ.
 */
export function bratislavaTimeStr(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: BRATISLAVA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/**
 * Returns Bratislava wall-clock parts for the given instant. Independent of
 * the runtime TZ. `weekday` follows JS Date.getDay() convention (0 = Sunday).
 */
export function bratislavaPartsOf(d: Date): {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BRATISLAVA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: weekdayMap[get("weekday")] ?? 0,
    hour: Number(get("hour")) % 24, // "24" can appear for midnight in some locales
    minute: Number(get("minute")),
  };
}

/**
 * Parses a "YYYY-MM-DD" date + "HH:mm" time as Bratislava wall-clock time and
 * returns the correct UTC instant. Independent of the runtime TZ, DST-aware.
 */
export function bratislavaLocalToUtc(dateStr: string, timeStr: string): Date {
  const [hh, mm] = timeStr.split(":").map(Number);
  const asUtc = new Date(`${dateStr}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00Z`);
  // Format that instant in Bratislava; difference from the input is the offset.
  const displayed = new Intl.DateTimeFormat("sv-SE", {
    timeZone: BRATISLAVA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(asUtc);
  const displayedAsUtc = new Date(displayed.replace(" ", "T") + "Z");
  const offsetMs = displayedAsUtc.getTime() - asUtc.getTime();
  return new Date(asUtc.getTime() - offsetMs);
}
