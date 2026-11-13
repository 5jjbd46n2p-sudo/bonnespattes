"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarPlus } from "@phosphor-icons/react";

function fmt(d) {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
}

// Bouton « Ajouter au planning » d'un document : crée ses tâches datées, sans doublon.
export default function AddPlanToPlanning({ slug, count, from, to }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function add() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/documents/${slug}/planning`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Ajout impossible, réessaie.");
      setResult(data);
    } catch (e) {
      setError(e.message || "Ajout impossible, réessaie.");
    } finally {
      setLoading(false);
    }
  }

  let message = null;
  if (result) {
    const already = result.total - result.added;
    if (result.added === 0) message = "Toutes les tâches étaient déjà dans le planning.";
    else {
      message = `${result.added} tâche${result.added > 1 ? "s ajoutées" : " ajoutée"} au planning`;
      message += already > 0 ? ` (${already} déjà présente${already > 1 ? "s" : ""}).` : ".";
    }
  }

  return (
    <div>
      <p className="text-pierre leading-relaxed">
        {count} tâches datées, du {fmt(from)} au {fmt(to)}. Elles sont créées sans heure, à toi de les placer dans ta
        journée. Tu peux relancer l'ajout sans risque : une tâche déjà présente n'est pas créée deux fois.
      </p>
      <div className="flex flex-wrap items-center gap-3 mt-3">
        <button onClick={add} disabled={loading} className="btn-primary text-sm gap-2">
          <CalendarPlus size={20} aria-hidden="true" />
          {loading ? "Ajout..." : "Ajouter au planning"}
        </button>
        {result && (
          <Link href="/admin/planning" className="text-sm text-rouille underline">
            Voir le planning
          </Link>
        )}
      </div>
      {message && (
        <p role="status" className="text-sm font-bold text-mousse mt-2">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm font-bold text-brique mt-2">
          {error}
        </p>
      )}
    </div>
  );
}
