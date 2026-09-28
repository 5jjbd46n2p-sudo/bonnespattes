"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import GlobalSearch from "@/components/GlobalSearch";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";
import { CalendarDays, House, Plus, ReceiptEuro, Settings, Users } from "lucide-react";

const links = [
  { href: "/admin", label: "Aujourd'hui", icon: House, exact: true },
  { href: "/admin/planning", label: "Planning", icon: CalendarDays },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/accounting", label: "Comptabilité", icon: ReceiptEuro },
  { href: "/admin/settings", label: "Réglages", icon: Settings },
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
    <aside className="w-60 shrink-0 bg-nav text-white hidden md:flex flex-col sticky top-0 h-screen">
      <div className="px-5 py-5 border-b border-white/10">
        <Link href="/admin">
          <Logo light />
        </Link>
      </div>
      <div className="px-3 pt-4">
        <GlobalSearch variant="sidebar" />
      </div>
      <div className="px-3 pt-3">
        <Link href="/admin/visits/new" className="btn-accent w-full text-sm gap-1.5">
          <Plus className="w-4 h-4" strokeWidth={2.5} />
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-white/12 text-white" : "text-white/70 hover:bg-white/8 hover:text-white"
              }`}
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={1.9} />
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-white/10 text-xs text-white/60">
        <div className="mb-3">
          <ThemeToggle compact />
        </div>
        <p className="truncate mb-2">{email}</p>
        <button onClick={logout} className="text-white/80 hover:text-white underline">
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
