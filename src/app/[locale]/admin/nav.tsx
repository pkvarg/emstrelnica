"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CreditCard,
  Clock,
  Ban,
  BarChart3,
  ScrollText,
  MessageSquare,
  FileCheck,
  Shield,
  Settings,
  AlertTriangle,
  ExternalLink,
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface AdminNavProps {
  user: { name: string };
  labels: {
    dashboard: string;
    users: string;
    bookings: string;
    membership: string;
    openingHours: string;
    closures: string;
    statistics: string;
    audit: string;
    logout: string;
  };
  locale: string;
}

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  danger?: boolean;
}

interface NavGroup {
  title: string;
  links: NavLink[];
}

export function AdminNav({ user, labels, locale }: AdminNavProps) {
  const pathname = usePathname();
  const t = useTranslations("adminNav");

  const groups: NavGroup[] = [
    {
      title: "",
      links: [
        { href: `/${locale}/admin`, label: labels.dashboard, icon: LayoutDashboard },
      ],
    },
    {
      title: t("groups.members"),
      links: [
        { href: `/${locale}/admin/pouzivatelia`, label: labels.users, icon: Users },
        { href: `/${locale}/admin/clenstvo`, label: labels.membership, icon: CreditCard },
      ],
    },
    {
      title: t("groups.range"),
      links: [
        { href: `/${locale}/admin/rezervacie`, label: labels.bookings, icon: CalendarCheck },
        { href: `/${locale}/admin/otvaracie-hodiny`, label: labels.openingHours, icon: Clock },
        { href: `/${locale}/admin/uzavretia`, label: labels.closures, icon: Ban },
      ],
    },
    {
      title: t("groups.statistics"),
      links: [
        { href: `/${locale}/admin/statistiky`, label: labels.statistics, icon: BarChart3 },
      ],
    },
    {
      title: t("groups.system"),
      links: [
        { href: `/${locale}/admin/audit`, label: labels.audit, icon: ScrollText },
        { href: `/${locale}/admin/kontakt-log`, label: t("links.contactLog"), icon: MessageSquare },
        { href: `/${locale}/admin/suhlasy`, label: t("links.consent"), icon: FileCheck },
        { href: `/${locale}/admin/rate-limits`, label: t("links.rateLimits"), icon: Shield },
        { href: `/${locale}/admin/nastavenia`, label: t("links.settings"), icon: Settings },
      ],
    },
    {
      title: t("groups.dangerZone"),
      links: [
        { href: `/${locale}/admin/danger-zone`, label: t("links.dangerZone"), icon: AlertTriangle, danger: true },
      ],
    },
  ];

  const externalLinks = [
    { href: "https://analytics.pictusweb.com/share/9XzhLLnYeCtWULx9", label: t("links.analytics") },
  ];

  return (
    <nav className="flex h-screen sticky top-0 w-56 flex-col border-r border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-6 border-b border-zinc-800 pb-4">
        <p className="font-semibold text-zinc-100">{user.name}</p>
        <p className="text-xs font-medium text-amber-500">Admin</p>
      </div>

      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.title || "_dashboard"}>
            {group.title && (
              <p className="mt-4 mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                {group.title}
              </p>
            )}
            {group.links.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              const activeClass = link.danger
                ? "bg-red-950/40 font-medium text-red-400"
                : "bg-zinc-800 font-medium text-amber-500";
              const inactiveClass = link.danger
                ? "text-red-500/80 hover:bg-red-950/30 hover:text-red-400"
                : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200";
              const iconClass = isActive
                ? link.danger ? "text-red-400" : "text-amber-500"
                : link.danger ? "text-red-500/70" : "text-zinc-500";
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive ? activeClass : inactiveClass
                  }`}
                >
                  <Icon size={16} className={iconClass} />
                  {link.label}
                </Link>
              );
            })}
          </div>
        ))}

        <div className="mt-4 border-t border-zinc-800 pt-3">
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            {t("groups.external")}
          </p>
          {externalLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-300"
            >
              <ExternalLink size={16} className="text-zinc-600" />
              {link.label}
            </a>
          ))}
        </div>
      </div>

      <div className="border-t border-zinc-800 pt-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 border-zinc-700 text-zinc-400 hover:text-zinc-200"
          onClick={() => signOut({ callbackUrl: `/${locale}/prihlasenie` })}
        >
          <LogOut size={14} />
          {labels.logout}
        </Button>
      </div>
    </nav>
  );
}
