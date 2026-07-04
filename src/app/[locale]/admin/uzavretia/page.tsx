import { db } from "@/db";
import { closures, ranges } from "@/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { AddClosureForm } from "./add-closure-form";
import { ClosureTable } from "./closure-table";

export default async function ClosuresPage() {
  const t = await getTranslations("closures");

  const allRanges = await db
    .select()
    .from(ranges)
    .where(eq(ranges.active, true))
    .orderBy(asc(ranges.sortOrder));

  const allClosures = await db
    .select()
    .from(closures)
    .orderBy(desc(closures.startsAt));

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <div className="mt-6">
        <AddClosureForm ranges={allRanges} />
      </div>

      <div className="mt-6">
        <ClosureTable closures={allClosures} ranges={allRanges} />
      </div>
    </div>
  );
}
