"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { Bell, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

function CrosshairIcon() {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-zinc-100/80 bg-zinc-900">
      <svg width="20" height="20" viewBox="0 0 28 28" fill="none" className="text-zinc-100" aria-hidden="true">
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

function LanguageSwitcher({ className = "flex" }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();

  const switchTo = locale === "sk" ? "hu" : "sk";
  const newPath = pathname.replace(`/${locale}`, `/${switchTo}`);

  return (
    <Link
      href={newPath}
      hrefLang={switchTo}
      lang={switchTo}
      aria-label={switchTo === "hu" ? "Magyar" : "Slovenčina"}
      className={`items-center gap-1 rounded border border-zinc-700 px-2.5 py-1 text-xs font-semibold tracking-wider uppercase transition-colors hover:border-brand/50 hover:text-brand pointer-coarse:py-2.5 ${className}`}
    >
      <span aria-hidden="true" className={locale === "sk" ? "text-brand" : "text-zinc-500"}>SK</span>
      <span aria-hidden="true" className="text-zinc-600">/</span>
      <span aria-hidden="true" className={locale === "hu" ? "text-brand" : "text-zinc-500"}>HU</span>
    </Link>
  );
}

function PendingBadge({ locale }: { locale: string }) {
  const t = useTranslations("common");
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
      title={t("pendingRequests", { count })}
      aria-label={t("pendingRequests", { count })}
    >
      <Bell size={14} aria-hidden="true" />
      {count}
    </Link>
  );
}

export function Navbar() {
  const t = useTranslations("common");
  const locale = useLocale();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const navLinks = [
    { href: `/${locale}`, label: t("home") },
    { href: `/${locale}/kontakt`, label: t("contact") },
    { href: `/${locale}/gdpr`, label: "GDPR" },
    { href: `/${locale}/pravidla-strelnice`, label: t("rules") },
  ];

  return (
    <nav aria-label={t("menu")} className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur-md">
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
          <LanguageSwitcher className="hidden md:flex" />
          <ThemeToggle className="hidden md:inline-flex" />
          {session?.user ? (
            <button
              onClick={() => signOut({ callbackUrl: `/${locale}/prihlasenie` })}
              className="inline-flex items-center gap-1.5 rounded-sm bg-brand px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-black transition-colors hover:bg-brand/85 pointer-coarse:py-3.5"
            >
              {t("logout")}
              <span aria-hidden="true">›</span>
            </button>
          ) : (
            <Link
              href={`/${locale}/prihlasenie`}
              className="inline-flex items-center gap-1.5 rounded-sm bg-brand px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-black transition-colors hover:bg-brand/85 pointer-coarse:py-3.5"
            >
              {t("login")}
              <span aria-hidden="true">›</span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={t("menu")}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-zinc-700 text-zinc-200 transition-colors hover:border-brand/50 hover:text-brand md:hidden"
          >
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open && (
        <div id="mobile-menu" className="border-t border-zinc-800/60 px-4 py-3 md:hidden">
          <div className="flex flex-col">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-1 py-3 text-xs font-bold uppercase tracking-[0.15em] text-zinc-300 transition-colors hover:text-brand"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-3 border-t border-zinc-800/60 pt-3">
            <LanguageSwitcher className="inline-flex" />
            <ThemeToggle />
          </div>
        </div>
      )}
    </nav>
  );
}
