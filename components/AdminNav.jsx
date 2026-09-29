"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import GlobalSearch from "@/components/GlobalSearch";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";
import { Sun, CalendarBlank, PawPrint, Receipt, GearSix, Plus } from "@phosphor-icons/react";

const links = [
  { href: "/admin", label: "Aujourd'hui", icon: Sun, exact: true },
  { href: "/admin/planning", label: "Planning", icon: CalendarBlank },
  { href: "/admin/clients", label: "Clients", icon: PawPrint },
  { href: "/admin/accounting", label: "Comptabilité", icon: Receipt },
  { href: "/admin/settings", label: "Réglages", icon: GearSix },
];

export default function AdminNav({ email }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-60 shrink-0 bg-nav text-sur-nav hidden md:flex flex-col sticky top-0 h-screen">
      <div className="px-5 py-6 border-b border-white/10">
        <Link href="/admin" aria-label="Aux Bonnes Pattes, accueil">
          <Logo size={26} />
        </Link>
      </div>
      <div className="px-3 pt-4">
        <GlobalSearch variant="sidebar" />
      </div>
      <div className="px-3 pt-3">
        <Link href="/admin/visits/new" className="btn-primary w-full text-sm">
          <Plus size={20} aria-hidden="true" />
          Planifier une visite
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map((l) => {
          const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                active ? "bg-rouille text-sur-rouille" : "text-sur-nav/75 hover:bg-white/10 hover:text-sur-nav"
              }`}
            >
              <Icon size={20} aria-hidden="true" />
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-white/10 text-xs text-sur-nav/60">
        <div className="mb-3">
          <ThemeToggle compact />
        </div>
        <p className="truncate mb-2">{email}</p>
        <button onClick={logout} className="text-sur-nav/80 hover:text-sur-nav underline">
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
