import { getTranslations } from "next-intl/server";
import Link from "next/link";
import {
  Target,
  Crosshair,
  CircleDot,
  Disc,
  Presentation,
  Tent,
  Landmark,
  type LucideIcon,
} from "lucide-react";
import { db } from "@/db";
import { ranges as rangesTable } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { formatEur, type RangePricing } from "@/lib/pricing";
import { AvailabilityCalendar } from "./availability-calendar";
import { OpeningHoursPanel } from "./opening-hours-panel";
import { OpenNowBadge } from "./open-now-badge";

export const dynamic = "force-dynamic";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1595590424283-b8f17842773f?q=80&w=2070&auto=format&fit=crop";

const RESOURCE_ICONS: Record<string, LucideIcon> = {
  r50: Target,
  r25: Crosshair,
  parkur: CircleDot,
  trap: Disc,
  miestnost: Presentation,
  altanok: Tent,
  areal: Landmark,
};

interface Resource {
  id: string;
  nameSk: string;
  nameHu: string;
  kind: "range" | "space";
  capacity: number;
  allowWholeRange: boolean;
  descriptionSk: string | null;
  descriptionHu: string | null;
  pricing: RangePricing | null;
}

function priceLabel(pricing: RangePricing | null, locale: string): string | null {
  if (!pricing) return null;
  const perHour = locale === "hu" ? "€/óra" : "€/hod";
  const from = (cents: number) =>
    locale === "hu"
      ? `${formatEur(cents)}/óra ártól`
      : `od ${formatEur(cents)}/hod`;
  switch (pricing.type) {
    case "hourlyUnit":
      return from(pricing.unitHourCents);
    case "perPersonHourly": {
      const min = Math.min(...pricing.tiers.map((t) => t.hourCents));
      return from(min);
    }
    case "hourlyFlat":
      return `${formatEur(pricing.hourCents).replace(" €", "")} ${perHour}`;
    case "firstNext":
      return locale === "hu"
        ? `első óra ${formatEur(pricing.firstHourCents)}`
        : `prvá hodina ${formatEur(pricing.firstHourCents)}`;
    case "info":
      return locale === "hu" ? pricing.noteHu : pricing.noteSk;
  }
}

async function loadResources(): Promise<Resource[]> {
  try {
    return await db
      .select({
        id: rangesTable.id,
        nameSk: rangesTable.nameSk,
        nameHu: rangesTable.nameHu,
        kind: rangesTable.kind,
        capacity: rangesTable.capacity,
        allowWholeRange: rangesTable.allowWholeRange,
        descriptionSk: rangesTable.descriptionSk,
        descriptionHu: rangesTable.descriptionHu,
        pricing: rangesTable.pricing,
      })
      .from(rangesTable)
      .where(eq(rangesTable.active, true))
      .orderBy(asc(rangesTable.sortOrder));
  } catch {
    // DB not reachable (e.g. build time) — section falls back to empty.
    return [];
  }
}

/** Same convention as the availability calendar: straight to the booking
 *  form when authenticated, otherwise via login with a callback URL. */
function bookingHref(
  locale: string,
  isAuthenticated: boolean,
  rangeId: string,
): string {
  const target = `/${locale}/app/rezervacie/nova?rangeId=${encodeURIComponent(rangeId)}`;
  if (isAuthenticated) return target;
  return `/${locale}/prihlasenie?callbackUrl=${encodeURIComponent(target)}`;
}

function ResourceCard({
  resource,
  index,
  locale,
  chips,
  href,
  bookLabel,
}: {
  resource: Resource;
  index: number;
  locale: string;
  chips: string[];
  href: string;
  bookLabel: string;
}) {
  const Icon = RESOURCE_ICONS[resource.id] ?? Target;
  const name = locale === "hu" ? resource.nameHu : resource.nameSk;
  const description =
    locale === "hu" ? resource.descriptionHu : resource.descriptionSk;

  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50 p-7 transition-all duration-300 hover:border-brand/40 hover:bg-zinc-900/80"
    >
      <div className="absolute -right-3 -top-5 font-[family-name:var(--font-bebas)] text-[100px] italic leading-none text-zinc-800/40 transition-colors group-hover:text-brand/10">
        {String(index + 1).padStart(2, "0")}
      </div>
      <div className="relative flex flex-1 flex-col">
        <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-sm bg-brand/10 text-brand">
          <Icon size={22} strokeWidth={1.75} />
        </div>
        <h3 className="mb-2 font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-zinc-100">
          {name}
        </h3>
        {description && (
          <p className="text-sm leading-relaxed text-zinc-400">{description}</p>
        )}
        {chips.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 pt-1">
            {chips.map((chip) => (
              <span
                key={chip}
                className="rounded-sm border border-zinc-700/80 bg-zinc-900 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-zinc-300"
              >
                {chip}
              </span>
            ))}
          </div>
        )}
        <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.15em] text-brand opacity-80 transition-opacity group-hover:opacity-100">
          {bookLabel}
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations();
  const [resources, session] = await Promise.all([loadResources(), auth()]);
  const isAuthenticated = !!session?.user;

  // Purely presentational: render the last word of the headline in brand yellow
  const headline = t("landing.heroHeadline");
  const words = headline.split(" ");
  const headlineStart = words.slice(0, -1).join(" ");
  const headlineEnd = words[words.length - 1];

  const buildChips = (r: Resource): string[] => {
    const chips: string[] = [];
    if (r.capacity > 1) chips.push(t("landing.boxes", { count: r.capacity }));
    const price = priceLabel(r.pricing, locale);
    if (price) chips.push(price);
    if (r.allowWholeRange) chips.push(t("landing.wholeRangeChip"));
    if (r.kind === "space") chips.push(t("landing.spaceBadge"));
    return chips;
  };

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden border-b border-zinc-800">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/85 to-zinc-950/40" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950/50" aria-hidden />

        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
          <div className="max-w-2xl">
            <OpenNowBadge />
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px w-8 bg-brand" />
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-brand">
                {t("landing.subtitle")}
              </span>
            </div>
            <h1 className="font-[family-name:var(--font-bebas)] text-5xl italic leading-[1.0] tracking-wide sm:text-7xl">
              <span className="text-zinc-50">{headlineStart} </span>
              <span className="text-brand">{headlineEnd}</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-zinc-300">
              {t("landing.heroSub")}
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href={`/${locale}/prihlasenie`}
                className="inline-flex items-center gap-2 rounded-sm bg-brand-red px-7 py-3.5 text-sm font-bold uppercase tracking-[0.1em] text-white shadow-lg shadow-brand-red/20 transition-colors hover:bg-brand-red/85"
              >
                {t("landing.heroCta")}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href={`/${locale}/pravidla-strelnice`}
                className="inline-flex items-center rounded-sm border border-zinc-600 px-7 py-3.5 text-sm font-bold uppercase tracking-[0.1em] text-zinc-200 transition-colors hover:border-brand hover:text-brand"
              >
                {t("common.rules")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="mb-10 flex items-center gap-4">
            <div className="h-px flex-1 bg-zinc-800" />
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl italic tracking-widest text-zinc-100">
              {t("landing.rangesHeading")}
            </h2>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>
          {resources.length === 0 ? (
            <p className="text-center text-sm text-zinc-500">
              {t("landing.noRanges")}
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {resources.map((r, i) => (
                <ResourceCard
                  key={r.id}
                  resource={r}
                  index={i}
                  locale={locale}
                  chips={buildChips(r)}
                  href={bookingHref(locale, isAuthenticated, r.id)}
                  bookLabel={t("landing.bookResource")}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="border-b border-zinc-800">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <OpeningHoursPanel />
        </div>
      </section>

      <section className="border-b border-zinc-800">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <AvailabilityCalendar />
        </div>
      </section>

      <footer className="bg-zinc-950">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <span className="font-[family-name:var(--font-bebas)] text-xl tracking-widest text-zinc-500">
                {t("common.appName")}
              </span>
            </div>
            <div className="flex gap-6 text-sm text-zinc-500">
              <Link href={`/${locale}/gdpr`} className="hover:text-brand transition-colors">
                GDPR
              </Link>
              <Link href={`/${locale}/pravidla-strelnice`} className="hover:text-brand transition-colors">
                {t("common.rules")}
              </Link>
              <Link href={`/${locale}/podmienky`} className="hover:text-brand transition-colors">
                {t("common.terms")}
              </Link>
              <Link href={`/${locale}/kontakt`} className="hover:text-brand transition-colors">
                {t("common.contact")}
              </Link>
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center gap-2 border-t border-zinc-800 pt-6 text-center text-xs text-zinc-600 sm:flex-row sm:justify-between">
            <span>
              &copy; {new Date().getFullYear()} {t("common.appName")}. {t("landing.footerRights")}.
            </span>
            <a
              href="https://pictusweb.sk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono tracking-wider text-zinc-500 transition-colors hover:text-brand"
            >
              <span className="text-brand/80">&lt;/&gt;</span> PICTUSWEB
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
