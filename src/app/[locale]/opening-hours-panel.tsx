import { db } from "@/db";
import { ranges, openingHoursTemplates } from "@/db/schema";
import { eq, and, lte, or, isNull, gte, asc } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { bratislavaDateStr } from "@/lib/format";

function hm(s: string): string {
  return s.slice(0, 5);
}

export async function OpeningHoursPanel() {
  const locale = await getLocale();
  const t = await getTranslations();
  const todayStr = bratislavaDateStr();

  const [activeRanges, hours] = await Promise.all([
    db
      .select({ id: ranges.id, nameSk: ranges.nameSk, nameHu: ranges.nameHu })
      .from(ranges)
      .where(eq(ranges.active, true))
      .orderBy(asc(ranges.sortOrder)),
    db
      .select({
        rangeId: openingHoursTemplates.rangeId,
        weekday: openingHoursTemplates.weekday,
        startTime: openingHoursTemplates.startTime,
        endTime: openingHoursTemplates.endTime,
      })
      .from(openingHoursTemplates)
      .where(
        and(
          lte(openingHoursTemplates.validFrom, todayStr),
          or(
            isNull(openingHoursTemplates.validTo),
            gte(openingHoursTemplates.validTo, todayStr),
          ),
        ),
      ),
  ]);

  const byRangeDay = new Map<string, { start: string; end: string }>();
  for (const h of hours) {
    byRangeDay.set(`${h.rangeId}:${h.weekday}`, {
      start: hm(h.startTime),
      end: hm(h.endTime),
    });
  }

  const weekdayLabels = t.raw("openingHours.days") as string[];
  const order = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div>
      <div className="mb-8 flex items-center gap-4">
        <div className="h-px flex-1 bg-zinc-800" />
        <h2 className="font-[family-name:var(--font-bebas)] text-3xl tracking-widest text-zinc-400">
          {t("openingHours.title")}
        </h2>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/60">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {t("openingHours.range")}
              </th>
              {order.map((d) => (
                <th
                  key={d}
                  className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500"
                >
                  {weekdayLabels[d].slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeRanges.map((r) => (
              <tr
                key={r.id}
                className="border-b border-zinc-800/50 last:border-b-0"
              >
                <td className="px-4 py-3 font-medium text-zinc-200">
                  {locale === "hu" ? r.nameHu : r.nameSk}
                </td>
                {order.map((d) => {
                  const h = byRangeDay.get(`${r.id}:${d}`);
                  return (
                    <td
                      key={d}
                      className="px-4 py-3 text-center text-xs font-mono"
                    >
                      {h ? (
                        <span className="text-zinc-300">
                          {h.start}–{h.end}
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
