"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/admin", label: "Aujourd'hui", exact: true },
  { href: "/admin/planning", label: "Planning" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/accounting", label: "Compta" },
  { href: "/admin/settings", label: "Réglages" },
];

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="md:hidden sticky top-0 z-20 bg-forest-dark text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="font-display font-semibold flex items-center gap-2">🐾 Aux Bonnes Pattes</span>
        <button onClick={logout} className="text-xs text-white/80 underline">
          Déconnexion
        </button>
      </div>
      <div className="flex gap-1 px-2 pb-2 overflow-x-auto">
        {links.map((l) => {
          const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium ${
                active ? "bg-white/20" : "text-white/70"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
