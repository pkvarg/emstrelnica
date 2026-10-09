const TEXTS: Record<string, string> = {
  sk: "Ukážkový web od Pictusweb – strelnica ani termíny nie sú skutočné",
  hu: "Pictusweb bemutató oldal – a lőtér és az időpontok nem valósak",
};

// Fixed show-page label on every page. The spacer keeps it from covering the end of
// the page; the cookie banner (z-index 999) stays on top of it until answered.
export function DemoBanner({ locale }: { locale: string }) {
  return (
    <>
      <div aria-hidden className="h-12 shrink-0 sm:h-9" />
      <a
        href="https://pictusweb.sk"
        target="_blank"
        rel="noopener"
        className="fixed inset-x-0 bottom-0 z-40 bg-amber-500 px-4 py-1.5 text-center text-xs font-semibold leading-snug text-zinc-950 shadow-[0_-4px_12px_rgba(0,0,0,0.35)] transition-colors hover:bg-amber-400 sm:py-2 sm:text-sm"
      >
        {TEXTS[locale] ?? TEXTS.sk}
      </a>
    </>
  );
}
