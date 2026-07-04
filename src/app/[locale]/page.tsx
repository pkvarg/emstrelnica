import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { AvailabilityCalendar } from "./availability-calendar";
import { OpeningHoursPanel } from "./opening-hours-panel";
import { OpenNowBadge } from "./open-now-badge";

function TargetDecoration() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.03]">
      <svg className="absolute -right-32 -top-32 h-[600px] w-[600px]" viewBox="0 0 400 400" fill="none">
        <circle cx="200" cy="200" r="180" stroke="white" strokeWidth="1" />
        <circle cx="200" cy="200" r="140" stroke="white" strokeWidth="1" />
        <circle cx="200" cy="200" r="100" stroke="white" strokeWidth="1" />
        <circle cx="200" cy="200" r="60" stroke="white" strokeWidth="1" />
        <circle cx="200" cy="200" r="20" stroke="white" strokeWidth="2" />
        <line x1="200" y1="0" x2="200" y2="400" stroke="white" strokeWidth="0.5" />
        <line x1="0" y1="200" x2="400" y2="200" stroke="white" strokeWidth="0.5" />
      </svg>
    </div>
  );
}

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
    <div className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 transition-all duration-300 hover:border-amber-600/30 hover:bg-zinc-900/80">
      <div className="absolute -right-4 -top-4 font-[family-name:var(--font-bebas)] text-[120px] leading-none text-zinc-800/30 transition-colors group-hover:text-amber-600/10">
        {icon === "50m" ? "50" : "BR"}
      </div>
      <div className="relative">
        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600/10 text-amber-500">
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

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden border-b border-zinc-800">
        <TargetDecoration />
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/10 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
          <div className="max-w-2xl">
            <OpenNowBadge />
            <h1 className="font-[family-name:var(--font-bebas)] text-5xl leading-[1.1] tracking-wide text-zinc-50 sm:text-7xl">
              {t("landing.heroHeadline")}
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-zinc-400">
              {t("landing.heroSub")}
            </p>
            <div className="mt-10 flex gap-4">
              <Link
                href={`/${locale}/prihlasenie`}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-500"
              >
                {t("landing.heroCta")}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href={`/${locale}/pravidla-strelnice`}
                className="inline-flex items-center rounded-lg border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
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
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl tracking-widest text-zinc-400">
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
              <Link href={`/${locale}/gdpr`} className="hover:text-zinc-300 transition-colors">
                GDPR
              </Link>
              <Link href={`/${locale}/pravidla-strelnice`} className="hover:text-zinc-300 transition-colors">
                {t("common.rules")}
              </Link>
              <Link href={`/${locale}/podmienky`} className="hover:text-zinc-300 transition-colors">
                {t("common.terms")}
              </Link>
              <Link href={`/${locale}/kontakt`} className="hover:text-zinc-300 transition-colors">
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
              className="inline-flex items-center gap-1.5 font-mono tracking-wider text-zinc-500 transition-colors hover:text-amber-500"
            >
              <span className="text-amber-500/80">&lt;/&gt;</span> PICTUSWEB
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
