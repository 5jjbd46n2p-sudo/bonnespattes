"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function VisitQuickActions({ visitId, status }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function setStatus(newStatus) {
    setLoading(true);
    await fetch(`/api/visits/${visitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      {status === "PLANIFIE" && (
        <button
          disabled={loading}
          onClick={() => setStatus("EN_COURS")}
          className="btn-ghost !py-1.5 !px-3 text-sm"
        >
          ▶ En cours
        </button>
      )}
      {status !== "FAIT" && (
        <button
          disabled={loading}
          onClick={() => setStatus("FAIT")}
          className="btn-primary !py-1.5 !px-3 text-sm"
        >
          ✓ Terminée
        </button>
      )}
      <Link href={`/admin/visits/${visitId}`} className="btn-ghost !py-1.5 !px-3 text-sm">
        Détail
      </Link>
    </div>
  );
}
