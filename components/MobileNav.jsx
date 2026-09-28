"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import GlobalSearch from "@/components/GlobalSearch";
import Logo from "@/components/Logo";
import { CalendarDays, House, Plus, ReceiptEuro, Settings, Users } from "lucide-react";

// Onglets de la barre du bas (façon iOS) — le bouton central sert à planifier.
const tabs = [
  { href: "/admin", label: "Aujourd'hui", icon: House, exact: true },
  { href: "/admin/planning", label: "Planning", icon: CalendarDays },
  { href: "/admin/visits/new", label: "Planifier", icon: Plus, primary: true },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/accounting", label: "Compta", icon: ReceiptEuro },
];

export default function MobileNav() {
  const pathname = usePathname();
  const settingsActive = pathname.startsWith("/admin/settings");

  return (
    <>
      {/* En-tête compact : marque + recherche + réglages */}
      <header className="md:hidden sticky top-0 z-20 bg-nav text-white pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between px-3 h-12">
          <Link href="/admin" className="pl-1">
            <Logo light markClassName="w-7 h-7" />
          </Link>
          <div className="flex items-center">
            <GlobalSearch variant="icon" />
            <Link
              href="/admin/settings"
              aria-label="Réglages"
              className={`w-10 h-10 flex items-center justify-center rounded-full ${
                settingsActive ? "bg-white/15" : "hover:bg-white/10"
              }`}
            >
              <Settings className="w-5 h-5" strokeWidth={1.9} />
            </Link>
          </div>
        </div>
      </header>

      {/* Barre d'onglets fixe en bas de l'écran, à portée de pouce */}
      <nav
        aria-label="Navigation principale"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 tabbar pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="grid grid-cols-5 h-16">
          {tabs.map((t) => {
            const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
            const Icon = t.icon;
            if (t.primary) {
              return (
                <li key={t.href} className="flex items-center justify-center">
                  <Link
                    href={t.href}
                    aria-label="Planifier une visite"
                    className="w-12 h-12 rounded-2xl bg-ochre text-on-accent flex items-center justify-center shadow-md active:scale-95 transition-transform"
                  >
                    <Icon className="w-6 h-6" strokeWidth={2.5} />
                  </Link>
                </li>
              );
            }
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={`h-full flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
                    active ? "text-forest" : "text-muted"
                  }`}
                >
                  <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
