import { db } from "@/db";
import { openingHoursTemplates, ranges } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { AddHoursForm } from "./add-hours-form";
import { HoursTable } from "./hours-table";

export default async function OpeningHoursPage() {
  const t = await getTranslations("openingHours");

  const allRanges = await db
    .select()
    .from(ranges)
    .where(eq(ranges.active, true))
    .orderBy(asc(ranges.sortOrder));

  const allHours = await db
    .select()
    .from(openingHoursTemplates)
    .orderBy(
      asc(openingHoursTemplates.rangeId),
      asc(openingHoursTemplates.weekday),
    );

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <div className="mt-6">
        <AddHoursForm ranges={allRanges} />
      </div>

      <div className="mt-6">
        {allRanges.map((range) => (
          <div key={range.id} className="mb-8">
            <h2 className="text-lg font-semibold">
              {range.nameSk} ({range.id})
            </h2>
            <HoursTable
              hours={allHours.filter((h) => h.rangeId === range.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
