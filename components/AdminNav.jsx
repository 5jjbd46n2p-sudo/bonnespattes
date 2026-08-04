"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/admin", label: "Aujourd'hui", icon: "🏠", exact: true },
  { href: "/admin/planning", label: "Planning", icon: "🗓️" },
  { href: "/admin/clients", label: "Clients", icon: "🐾" },
  { href: "/admin/accounting", label: "Comptabilité", icon: "💶" },
  { href: "/admin/settings", label: "Réglages", icon: "⚙️" },
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
    <aside className="w-60 shrink-0 bg-forest-dark text-white flex flex-col hidden md:flex">
      <div className="px-6 py-6 flex items-center gap-2 border-b border-white/10">
        <span className="text-2xl">🐾</span>
        <span className="font-display font-semibold text-lg leading-tight">
          Aux Bonnes
          <br />
          Pattes
        </span>
      </div>
      <nav className="flex-1 px-3 py-5 space-y-1">
        {links.map((l) => {
          const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span>{l.icon}</span>
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-white/10 text-xs text-white/60">
        <p className="truncate mb-2">{email}</p>
        <button onClick={logout} className="text-white/80 hover:text-white underline">
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
