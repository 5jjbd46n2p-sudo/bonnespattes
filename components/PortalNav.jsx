"use client";

import { useRouter } from "next/navigation";

export default function PortalNav({ clientName }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-nav text-white">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
        <span className="font-display font-semibold flex items-center gap-2">🐾 Aux Bonnes Pattes</span>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-white/80 hidden sm:inline">{clientName}</span>
          <button onClick={logout} className="underline text-white/80 hover:text-white">
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
}
