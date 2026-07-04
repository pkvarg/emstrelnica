"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

function CrosshairIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-amber-500">
      <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14" cy="14" r="4" stroke="currentColor" strokeWidth="1.5" />
      <line x1="14" y1="0" x2="14" y2="6" stroke="currentColor" strokeWidth="1.5" />
      <line x1="14" y1="22" x2="14" y2="28" stroke="currentColor" strokeWidth="1.5" />
      <line x1="0" y1="14" x2="6" y2="14" stroke="currentColor" strokeWidth="1.5" />
      <line x1="22" y1="14" x2="28" y2="14" stroke="currentColor" strokeWidth="1.5" />
    </svg>
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
      className="flex items-center gap-1 rounded border border-zinc-700 px-2.5 py-1 text-xs font-semibold tracking-wider uppercase transition-colors hover:border-amber-500/50 hover:text-amber-500"
    >
      <span className={locale === "sk" ? "text-amber-500" : "text-zinc-500"}>SK</span>
      <span className="text-zinc-600">/</span>
      <span className={locale === "hu" ? "text-amber-500" : "text-zinc-500"}>HU</span>
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
      className="flex items-center gap-1.5 rounded-md border border-amber-600/60 bg-amber-600/10 px-2.5 py-1 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-600/20"
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
    <nav className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href={`/${locale}`} className="flex items-center gap-2.5 group">
          <CrosshairIcon />
          <span className="font-[family-name:var(--font-bebas)] text-2xl tracking-widest text-zinc-100 group-hover:text-amber-500 transition-colors">
            {t("appName")}
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-100 hover:bg-zinc-800/50"
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
              className="rounded-md bg-amber-600 px-4 py-1.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-500"
            >
              {t("logout")}
            </button>
          ) : (
            <Link
              href={`/${locale}/prihlasenie`}
              className="rounded-md bg-amber-600 px-4 py-1.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-500"
            >
              {t("login")}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
