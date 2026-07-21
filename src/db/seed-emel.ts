import { config } from "dotenv";
config({ path: ".env.local" });
config();
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and } from "drizzle-orm";
import * as schema from "./schema";
import type { RangePricing } from "../lib/pricing";

/**
 * Seeds the EMEL demo facility: 4 shooting ranges + 3 rentable spaces,
 * with capacities and pricing taken from strelnica-emel.sk/cennik.
 * Idempotent: ranges are upserted; opening hours are only created for
 * ranges that have none.
 *
 * Usage: pnpm seed:emel
 */

const WHOLE_RANGE_TIERS = {
  hourCents: 5000, // 1 h — 50 €
  from4hHourCents: 4500, // 4+ h — 45 €/h
  from8hHourCents: 4000, // 8 h — 40 €/h
};

interface SeedRange {
  id: string;
  nameSk: string;
  nameHu: string;
  kind: "range" | "space";
  capacity: number;
  maxGroupSize: number;
  blocksAll: boolean;
  allowWholeRange: boolean;
  sortOrder: number;
  descriptionSk: string;
  descriptionHu: string;
  pricing: RangePricing;
}

const RESOURCES: SeedRange[] = [
  {
    id: "r50",
    nameSk: "50 m guľová strelnica",
    nameHu: "50 m-es golyós lőtér",
    kind: "range",
    capacity: 6,
    maxGroupSize: 2,
    blocksAll: false,
    allowWholeRange: true,
    sortOrder: 1,
    descriptionSk:
      "6 streleckých boxov na streľbu z krátkych aj dlhých zbraní od 10 do 50 m. V cene kabínky stojan, 2× terč, okuliare a chrániče sluchu.",
    descriptionHu:
      "6 lőállás rövid és hosszú fegyverekhez 10–50 m-ig. Az árban állvány, 2× céltábla, védőszemüveg és hallásvédő.",
    pricing: {
      type: "hourlyUnit",
      unitHourCents: 1000, // kabínka 10 €/h
      twoPersonUnitHourCents: 1500, // kabínka pre 2 strelcov 15 €/h
      wholeRange: WHOLE_RANGE_TIERS,
    },
  },
  {
    id: "r25",
    nameSk: "25 m pištoľová strelnica",
    nameHu: "25 m-es pisztolylőtér",
    kind: "range",
    capacity: 4, // demo assumption — open range without boxes
    maxGroupSize: 1,
    blocksAll: false,
    allowWholeRange: true,
    sortOrder: 2,
    descriptionSk:
      "Otvorená strelnica bez boxov pre skúsenejších strelcov. Streľba na papierové a kovové terče.",
    descriptionHu:
      "Nyitott lőtér tapasztaltabb lövészeknek. Lövészet papír- és fémcélokra.",
    pricing: {
      type: "hourlyUnit",
      unitHourCents: 1000,
      wholeRange: WHOLE_RANGE_TIERS,
    },
  },
  {
    id: "parkur",
    nameSk: "Parkurová strelnica",
    nameHu: "Parkur lőtér",
    kind: "range",
    capacity: 1,
    maxGroupSize: 3,
    blocksAll: false,
    allowWholeRange: false,
    sortOrder: 3,
    descriptionSk: "Parkúrová streľba na asfaltové terče. Cena podľa počtu osôb (1–3).",
    descriptionHu: "Parkur lövészet agyagkorongokra. Ár a létszám szerint (1–3 fő).",
    pricing: {
      type: "perPersonHourly",
      tiers: [
        { persons: 1, hourCents: 1500 },
        { persons: 2, hourCents: 2500 },
        { persons: 3, hourCents: 3000 },
      ],
    },
  },
  {
    id: "trap",
    nameSk: "Broková strelnica (americký trap)",
    nameHu: "Sörétes lőtér (amerikai trap)",
    kind: "range",
    capacity: 1,
    maxGroupSize: 5,
    blocksAll: false,
    allowWholeRange: false,
    sortOrder: 4,
    descriptionSk:
      "Automatický trap s plávajúcou vrhačkou. Možnosť streľby aj bez zbrojného preukazu.",
    descriptionHu:
      "Automata trap úszó korongvetővel. Lövészet fegyvertartási engedély nélkül is.",
    pricing: {
      type: "info",
      noteSk: "4 € / 15 terčov, platba na mieste",
      noteHu: "4 € / 15 korong, fizetés a helyszínen",
    },
  },
  {
    id: "miestnost",
    nameSk: "Spoločenská miestnosť",
    nameHu: "Közösségi terem",
    kind: "space",
    capacity: 1,
    maxGroupSize: 1,
    blocksAll: false,
    allowWholeRange: false,
    sortOrder: 5,
    descriptionSk:
      "Miestnosť s projektorom s kapacitou 40 osôb, vhodná na teambuildingy a školenia.",
    descriptionHu:
      "Projektoros terem 40 fő részére, csapatépítőkre és képzésekre alkalmas.",
    pricing: {
      type: "info",
      noteSk: "Cena dohodou",
      noteHu: "Ár megegyezés szerint",
    },
  },
  {
    id: "altanok",
    nameSk: "Altánok",
    nameHu: "Pavilon",
    kind: "space",
    capacity: 1,
    maxGroupSize: 1,
    blocksAll: false,
    allowWholeRange: false,
    sortOrder: 6,
    descriptionSk:
      "Krytý altánok s barom a vonkajšou kuchyňou, kapacita 40 osôb. 50 € prvá hodina, 30 € každá ďalšia začatá hodina.",
    descriptionHu:
      "Fedett pavilon bárral és kültéri konyhával, 40 fő. Első óra 50 €, minden további megkezdett óra 30 €.",
    pricing: { type: "firstNext", firstHourCents: 5000, nextHourCents: 3000 },
  },
  {
    id: "areal",
    nameSk: "Celý areál",
    nameHu: "Teljes létesítmény",
    kind: "space",
    capacity: 1,
    maxGroupSize: 1,
    blocksAll: true,
    allowWholeRange: false,
    sortOrder: 7,
    descriptionSk:
      "Prenájom celého areálu strelnice EMEL. Blokuje všetky strelnice a priestory.",
    descriptionHu:
      "A teljes EMEL lőtér bérlése. Minden lőteret és teret lefoglal.",
    pricing: { type: "hourlyFlat", hourCents: 15000 },
  },
];

/** Opening hours: Tue–Sun 9:00–17:00 (Monday closed), matching EMEL. */
const OPEN_WEEKDAYS = [0, 2, 3, 4, 5, 6]; // 0 = Sunday

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client, { schema });

  const [admin] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.role, "admin"))
    .limit(1);

  if (!admin) {
    console.error("No admin user found — run `pnpm seed:admin` first.");
    process.exit(1);
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  for (const r of RESOURCES) {
    await db
      .insert(schema.ranges)
      .values(r)
      .onConflictDoUpdate({
        target: schema.ranges.id,
        set: {
          nameSk: r.nameSk,
          nameHu: r.nameHu,
          kind: r.kind,
          capacity: r.capacity,
          maxGroupSize: r.maxGroupSize,
          blocksAll: r.blocksAll,
          allowWholeRange: r.allowWholeRange,
          sortOrder: r.sortOrder,
          descriptionSk: r.descriptionSk,
          descriptionHu: r.descriptionHu,
          pricing: r.pricing,
          active: true,
        },
      });
    console.log(`✓ range ${r.id} (${r.nameSk})`);

    const existing = await db
      .select({ id: schema.openingHoursTemplates.id })
      .from(schema.openingHoursTemplates)
      .where(and(eq(schema.openingHoursTemplates.rangeId, r.id)))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.openingHoursTemplates).values(
        OPEN_WEEKDAYS.map((weekday) => ({
          rangeId: r.id,
          weekday,
          startTime: "09:00",
          endTime: "17:00",
          validFrom: todayStr,
          validTo: null,
          createdBy: admin.id,
        })),
      );
      console.log(`  + opening hours Tue–Sun 9:00–17:00`);
    } else {
      console.log(`  = opening hours already present, skipped`);
    }
  }

  await client.end();
  console.log("EMEL seed complete.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
