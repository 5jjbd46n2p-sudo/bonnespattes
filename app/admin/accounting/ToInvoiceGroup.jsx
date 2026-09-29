"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Receipt } from "@phosphor-icons/react";
import { formatDateFR, formatEUR } from "@/lib/utils";

function visitAmount(v) {
  return v.is_free ? 0 : (Number(v.price) || 0) + (Number(v.travel_fee) || 0);
}

export default function ToInvoiceGroup({ clientId, clientName, visits }) {
  const router = useRouter();
  const [selected, setSelected] = useState(new Set(visits.map((v) => v.id)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isTest, setIsTest] = useState(false);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const total = visits.filter((v) => selected.has(v.id)).reduce((s, v) => s + visitAmount(v), 0);

  async function create() {
    setError("");
    if (selected.size === 0) {
      setError("Coche au moins une visite.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/invoices/from-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, visitIds: Array.from(selected), isTest }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Impossible de créer la facture.");
        setLoading(false);
        return;
      }
      router.push(`/admin/accounting/invoices/${data.invoice.id}`);
      router.refresh();
    } catch {
      setError("Impossible de créer la facture. Vérifie ta connexion.");
      setLoading(false);
    }
  }

  return (
    <section className="card overflow-hidden" aria-label={`Visites à facturer pour ${clientName}`}>
      <h2 className="font-display text-xl font-semibold text-encre px-5 pt-4 pb-2">{clientName}</h2>
      <ul className="divide-y divide-trait border-t border-trait">
        {visits.map((v) => (
          <li key={v.id}>
            <label className="flex items-center gap-3 px-5 py-3 text-sm cursor-pointer hover:bg-sable">
              <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggle(v.id)} />
              <span className="flex-1 tabular-nums">
                {formatDateFR(v.date)} · {v.pet_name}
                {Number(v.travel_fee) > 0 && !v.is_free && (
                  <span className="text-pierre"> (dont déplacement {formatEUR(v.travel_fee)})</span>
                )}
              </span>
              {v.is_free ? (
                <span className="text-mousse font-bold">offerte</span>
              ) : (
                <span className="font-bold tabular-nums">{formatEUR(visitAmount(v))}</span>
              )}
            </label>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-4 border-t border-trait bg-sable">
        <p className="font-bold tabular-nums">Total : {formatEUR(total)}</p>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isTest} onChange={(e) => setIsTest(e.target.checked)} />
            Facture de test (FT)
          </label>
          <Link
            href={`/admin/accounting/invoices/new?clientId=${clientId}`}
            className="text-sm text-rouille underline"
          >
            Facture personnalisée
          </Link>
          <button type="button" onClick={create} disabled={loading} className="btn-primary text-sm gap-2">
            <Receipt size={20} aria-hidden="true" />
            {loading ? "Création..." : "Créer la facture"}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-brique px-5 pb-4">
          {error}
        </p>
      )}
    </section>
  );
}
