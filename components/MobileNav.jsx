"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, CalendarBlank, Plus, PawPrint, Receipt, GearSix, Tray, PaintBrush, FileText } from "@phosphor-icons/react";
import useNewLeadsCount from "@/app/admin/leads/useNewLeadsCount";
import GlobalSearch from "@/components/GlobalSearch";
import Logo from "@/components/Logo";

// Onglets de la barre du bas (façon iOS) — le bouton central sert à planifier.
const tabs = [
  { href: "/admin", label: "Aujourd'hui", icon: Sun, exact: true },
  { href: "/admin/planning", label: "Planning", icon: CalendarBlank },
  { href: "/admin/visits/new", label: "Planifier", icon: Plus, primary: true },
  { href: "/admin/clients", label: "Clients", icon: PawPrint },
  { href: "/admin/accounting", label: "Compta", icon: Receipt },
];

export default function MobileNav() {
  const pathname = usePathname();
  const newLeads = useNewLeadsCount(pathname);
  const leadsActive = pathname.startsWith("/admin/leads");
  const settingsActive = pathname.startsWith("/admin/settings");
  const conceptionActive = pathname.startsWith("/admin/conception");
  const documentsActive = pathname.startsWith("/admin/documents");

  return (
    <>
      {/* En-tête compact : marque + recherche + demandes + conception + documents + réglages */}
      <header className="md:hidden sticky top-0 z-20 bg-nav text-sur-nav pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between px-3 h-12">
          <Link href="/admin" aria-label="Aux Bonnes Pattes, accueil" className="pl-1">
            {/* Sous 430 px de large, l'empreinte seule : le nom complet ne tient pas à côté des cinq icônes. */}
            <span className="min-[430px]:hidden">
              <Logo size={24} showText={false} />
            </span>
            <span className="hidden min-[430px]:inline">
              <Logo size={22} />
            </span>
          </Link>
          <div className="flex items-center shrink-0">
            <GlobalSearch variant="icon" />
            <Link
              href="/admin/leads"
              aria-label={newLeads > 0 ? `Demandes, ${newLeads} nouvelle${newLeads > 1 ? "s" : ""}` : "Demandes"}
              aria-current={leadsActive ? "page" : undefined}
              className={`relative w-10 h-10 flex items-center justify-center rounded-full ${
                leadsActive ? "text-nav-actif" : "hover:bg-white/10"
              }`}
            >
              <Tray size={24} aria-hidden="true" />
              {newLeads > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-miel text-encre text-[10px] font-bold tabular-nums flex items-center justify-center">
                  {newLeads}
                </span>
              )}
            </Link>
            <Link
              href="/admin/conception"
              aria-label="Conception"
              aria-current={conceptionActive ? "page" : undefined}
              className={`w-10 h-10 flex items-center justify-center rounded-full ${
                conceptionActive ? "text-nav-actif" : "hover:bg-white/10"
              }`}
            >
              <PaintBrush size={24} aria-hidden="true" />
            </Link>
            <Link
              href="/admin/documents"
              aria-label="Documents"
              aria-current={documentsActive ? "page" : undefined}
              className={`w-10 h-10 flex items-center justify-center rounded-full ${
                documentsActive ? "text-nav-actif" : "hover:bg-white/10"
              }`}
            >
              <FileText size={24} aria-hidden="true" />
            </Link>
            <Link
              href="/admin/settings"
              aria-label="Réglages"
              aria-current={settingsActive ? "page" : undefined}
              className={`w-10 h-10 flex items-center justify-center rounded-full ${
                settingsActive ? "text-nav-actif" : "hover:bg-white/10"
              }`}
            >
              <GearSix size={24} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      {/* Barre d'onglets fixe en bas de l'écran, à portée de pouce */}
      <nav
        aria-label="Navigation principale"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 tabbar border-t border-white/10 pb-[env(safe-area-inset-bottom)]"
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
                    className="w-12 h-12 rounded-full bg-rouille text-sur-rouille flex items-center justify-center hover:bg-rouille-fonce transition-colors"
                  >
                    <Icon size={24} aria-hidden="true" />
                  </Link>
                </li>
              );
            }
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={`h-full flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors ${
                    active ? "text-nav-actif" : "text-sur-nav/70"
                  }`}
                >
                  <Icon size={24} aria-hidden="true" />
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
