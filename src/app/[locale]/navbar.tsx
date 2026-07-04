"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

function CrosshairIcon() {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-zinc-100/80 bg-zinc-900">
      <svg width="20" height="20" viewBox="0 0 28 28" fill="none" className="text-zinc-100">
        <circle cx="14" cy="14" r="9" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="14" cy="14" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        <line x1="14" y1="1" x2="14" y2="7" stroke="currentColor" strokeWidth="1.5" />
        <line x1="14" y1="21" x2="14" y2="27" stroke="currentColor" strokeWidth="1.5" />
        <line x1="1" y1="14" x2="7" y2="14" stroke="currentColor" strokeWidth="1.5" />
        <line x1="21" y1="14" x2="27" y2="14" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </span>
  );
}

function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  const switchTo = locale === "sk" ? "hu" : "sk";
  const newPath = pathname.replace(`/${locale}`, `/${switchTo}`);

  return (
    <Link
      href={newPath}
      className="flex items-center gap-1 rounded border border-zinc-700 px-2.5 py-1 text-xs font-semibold tracking-wider uppercase transition-colors hover:border-brand/50 hover:text-brand"
    >
      <span className={locale === "sk" ? "text-brand" : "text-zinc-500"}>SK</span>
      <span className="text-zinc-600">/</span>
      <span className={locale === "hu" ? "text-brand" : "text-zinc-500"}>HU</span>
    </Link>
  );
}

function PendingBadge({ locale }: { locale: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/admin/pending-count", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled) setCount(d.count ?? 0);
        })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 30_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (!count || count <= 0) return null;

  return (
    <Link
      href={`/${locale}/admin`}
      className="flex items-center gap-1.5 rounded-md border border-brand/60 bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand transition-colors hover:bg-brand/20"
      title={`${count} žiadostí čaká na schválenie`}
    >
      <Bell size={14} />
      {count}
    </Link>
  );
}

export function Navbar() {
  const t = useTranslations("common");
  const locale = useLocale();
  const { data: session } = useSession();

  const navLinks = [
    { href: `/${locale}`, label: t("home") },
    { href: `/${locale}/kontakt`, label: t("contact") },
    { href: `/${locale}/gdpr`, label: "GDPR" },
    { href: `/${locale}/pravidla-strelnice`, label: t("rules") },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href={`/${locale}`} className="flex items-center gap-2.5 group">
          <CrosshairIcon />
          <span className="font-[family-name:var(--font-bebas)] text-xl tracking-[0.2em] text-zinc-100 group-hover:text-brand transition-colors">
            {t("appName")}
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-zinc-300 transition-colors hover:text-brand"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {session?.user?.role === "admin" && <PendingBadge locale={locale} />}
          <LanguageSwitcher />
          {session?.user ? (
            <button
              onClick={() => signOut({ callbackUrl: `/${locale}/prihlasenie` })}
              className="inline-flex items-center gap-1.5 rounded-sm bg-brand px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-950 transition-colors hover:bg-brand/85"
            >
              {t("logout")}
              <span aria-hidden>›</span>
            </button>
          ) : (
            <Link
              href={`/${locale}/prihlasenie`}
              className="inline-flex items-center gap-1.5 rounded-sm bg-brand px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-950 transition-colors hover:bg-brand/85"
            >
              {t("login")}
              <span aria-hidden>›</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
