"use client";

import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

export default function PortalNav({ clientName }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-nav text-sur-nav">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
        <Logo size={24} />
        <div className="flex items-center gap-3 text-sm">
          <span className="text-sur-nav/80 hidden sm:inline">{clientName}</span>
          <button onClick={logout} className="underline text-sur-nav/80 hover:text-sur-nav">
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
}
