import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { AvailabilityCalendar } from "./availability-calendar";
import { OpeningHoursPanel } from "./opening-hours-panel";
import { OpenNowBadge } from "./open-now-badge";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1595590424283-b8f17842773f?q=80&w=2070&auto=format&fit=crop";

function RangeCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: "50m" | "shotgun";
}) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 transition-all duration-300 hover:border-brand/40 hover:bg-zinc-900/80">
      <div className="absolute -right-4 -top-4 font-[family-name:var(--font-bebas)] text-[120px] italic leading-none text-zinc-800/30 transition-colors group-hover:text-brand/10">
        {icon === "50m" ? "50" : "BR"}
      </div>
      <div className="relative">
        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-sm bg-brand/10 text-brand">
          {icon === "50m" ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
              <line x1="10" y1="2" x2="10" y2="7" stroke="currentColor" strokeWidth="1" />
              <line x1="10" y1="13" x2="10" y2="18" stroke="currentColor" strokeWidth="1" />
              <line x1="2" y1="10" x2="7" y2="10" stroke="currentColor" strokeWidth="1" />
              <line x1="13" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="1" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="6" r="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 18 L10 10 L17 18" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <h3 className="mb-2 font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-zinc-100">
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-zinc-400">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const t = useTranslations();
  const locale = useLocale();

  // Purely presentational: render the last word of the headline in brand yellow
  const headline = t("landing.heroHeadline");
  const words = headline.split(" ");
  const headlineStart = words.slice(0, -1).join(" ");
  const headlineEnd = words[words.length - 1];

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
          <div className="grid gap-6 md:grid-cols-2">
            <RangeCard
              title={t("landing.range50title")}
              description={t("landing.range50desc")}
              icon="50m"
            />
            <RangeCard
              title={t("landing.rangeBRtitle")}
              description={t("landing.rangeBRdesc")}
              icon="shotgun"
            />
          </div>
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
