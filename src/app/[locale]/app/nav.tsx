"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  CalendarCheck,
  User,
  BarChart3,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface AppNavProps {
  user: { name: string; role: string };
  labels: {
    dashboard: string;
    bookings: string;
    profile: string;
    statistics: string;
    roleAdmin: string;
    roleMember: string;
    administration: string;
  };
  locale: string;
}

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function AppNav({ user, labels, locale }: AppNavProps) {
  const pathname = usePathname();
  const [pending, setPending] = useState<number>(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user.role !== "admin") return;
    let cancelled = false;
    const load = () => {
      fetch("/api/admin/pending-count", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled) setPending(d.count ?? 0);
        })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user.role]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const links: NavLink[] = [
    { href: `/${locale}/app`, label: labels.dashboard, icon: LayoutDashboard },
    { href: `/${locale}/app/rezervacie`, label: labels.bookings, icon: CalendarCheck },
    { href: `/${locale}/app/profil`, label: labels.profile, icon: User },
    { href: `/${locale}/app/statistiky`, label: labels.statistics, icon: BarChart3 },
  ];

  const navBody = (
    <>
      <div className="mb-6 border-b border-zinc-800 pb-4">
        <p className="font-semibold text-zinc-100">{user.name}</p>
        <p className="text-xs text-zinc-500">{user.role === "admin" ? labels.roleAdmin : labels.roleMember}</p>
      </div>

      <div className="flex flex-1 flex-col gap-0.5">
        {user.role === "admin" && (
          <Link
            href={`/${locale}/admin`}
            className="mb-2 flex w-full items-center justify-between gap-2 rounded-md bg-amber-600/10 px-3 py-2 text-sm font-medium text-amber-500 transition-colors hover:bg-amber-600/20"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck size={14} />
              {labels.administration}
            </span>
            {pending > 0 && (
              <span className="rounded-full bg-amber-600 px-2 py-0.5 text-xs font-bold text-zinc-950">
                {pending}
              </span>
            )}
          </Link>
        )}
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-zinc-800 font-medium text-amber-500"
                  : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
              }`}
            >
              <Icon size={16} className={isActive ? "text-amber-500" : "text-zinc-500"} />
              {link.label}
            </Link>
          );
        })}
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menu"
        aria-expanded={open}
        className="fixed top-20 left-3 z-40 inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/90 text-zinc-200 shadow-lg backdrop-blur md:hidden"
      >
        <Menu size={20} />
      </button>

      <nav className="sticky top-0 hidden h-screen w-56 flex-col border-r border-zinc-800 bg-zinc-900 p-4 md:flex">
        {navBody}
      </nav>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <nav
        className={`fixed top-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-zinc-800 bg-zinc-900 p-4 transition-transform duration-200 md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <X size={18} />
        </button>
        {navBody}
      </nav>
    </>
  );
}
