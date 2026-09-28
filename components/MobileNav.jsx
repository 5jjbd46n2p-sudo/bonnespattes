"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import GlobalSearch from "@/components/GlobalSearch";

// Onglets de la barre du bas (façon iOS) — le bouton central sert à planifier.
const tabs = [
  { href: "/admin", label: "Aujourd'hui", icon: "🏠", exact: true },
  { href: "/admin/planning", label: "Planning", icon: "🗓️" },
  { href: "/admin/visits/new", label: "Planifier", icon: "+", primary: true },
  { href: "/admin/clients", label: "Clients", icon: "🐾" },
  { href: "/admin/accounting", label: "Compta", icon: "💶" },
];

export default function MobileNav() {
  const pathname = usePathname();
  const settingsActive = pathname.startsWith("/admin/settings");

  return (
    <>
      {/* En-tête compact : marque + recherche + réglages */}
      <header className="md:hidden sticky top-0 z-20 bg-nav text-white pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between px-3 h-12">
          <Link href="/admin" className="font-display font-semibold flex items-center gap-2 pl-1">
            🐾 Aux Bonnes Pattes
          </Link>
          <div className="flex items-center">
            <GlobalSearch variant="icon" />
            <Link
              href="/admin/settings"
              aria-label="Réglages"
              className={`w-10 h-10 flex items-center justify-center rounded-full text-lg ${
                settingsActive ? "bg-white/20" : "hover:bg-white/10"
              }`}
            >
              ⚙️
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
            if (t.primary) {
              return (
                <li key={t.href} className="flex items-center justify-center">
                  <Link
                    href={t.href}
                    aria-label="Planifier une visite"
                    className="w-12 h-12 -mt-5 rounded-full bg-ochre text-white text-3xl leading-none flex items-center justify-center shadow-lg ring-4 ring-[var(--color-sand)] active:scale-95 transition-transform"
                  >
                    {t.icon}
                  </Link>
                </li>
              );
            }
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={`h-full flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
                    active ? "text-forest-dark" : "text-muted"
                  }`}
                >
                  <span className={`text-xl leading-none ${active ? "" : "grayscale opacity-70"}`}>{t.icon}</span>
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
