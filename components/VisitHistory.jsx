"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDateFR } from "@/lib/utils";
import { VisitBillingBadge } from "@/components/StatusBadge";
import { Camera, CheckSquare } from "@phosphor-icons/react";

// Une visite liée à une vraie facture est verrouillée ; celle d'une facture de test peut être supprimée.
const locked = (v) => !!v.invoice_id && !v.invoice_is_test;

export default function VisitHistory({ visits }) {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selectable = visits.filter((v) => !locked(v));

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function stop() {
    setSelecting(false);
    setSelected(new Set());
    setError("");
  }

  async function removeSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Supprimer ${selected.size} visite${selected.size > 1 ? "s" : ""} ? Leurs tâches et leurs photos seront aussi supprimées. Cette action est définitive.`)) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/visits/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected) }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Suppression impossible.");
      return;
    }
    stop();
    router.refresh();
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h2 className="font-display text-xl font-semibold">Historique des visites</h2>
        {visits.length > 0 &&
          (selecting ? (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                className="text-sm text-rouille underline min-h-[44px]"
                onClick={() =>
                  setSelected(selected.size === selectable.length ? new Set() : new Set(selectable.map((v) => v.id)))
                }
              >
                {selected.size === selectable.length && selectable.length > 0 ? "Tout décocher" : "Tout cocher"}
              </button>
              <button type="button" onClick={stop} className="btn-ghost text-sm !py-1 !px-3">
                Annuler
              </button>
              <button
                type="button"
                onClick={removeSelected}
                disabled={busy || selected.size === 0}
                className="btn-primary text-sm !py-1 !px-3 disabled:opacity-50"
              >
                {busy ? "Suppression..." : `Supprimer (${selected.size})`}
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setSelecting(true)} className="btn-ghost text-sm !py-1 !px-3">
              Sélectionner
            </button>
          ))}
      </div>
      {error && (
        <p role="alert" className="text-sm font-bold text-brique mb-2">
          {error}
        </p>
      )}

      {visits.length === 0 ? (
        <p className="text-sm text-pierre">Pas encore de visite.</p>
      ) : (
        <div className="divide-y divide-trait -mx-5 border-t border-trait">
          {visits.map((v) => {
            const content = (
              <>
                <div>
                  <p className="font-medium tabular-nums">
                    {formatDateFR(v.date)} {v.start_time ? `· ${v.start_time.slice(0, 5)}` : ""} · {v.pet_name}
                  </p>
                  <p className="text-sm text-pierre mt-0.5 flex items-center gap-3 tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <CheckSquare size={16} aria-hidden="true" />
                      {v.task_done_count}/{v.task_count} tâches
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Camera size={16} aria-hidden="true" />
                      {v.photo_count} photo{v.photo_count > 1 ? "s" : ""}
                    </span>
                  </p>
                </div>
                <VisitBillingBadge visit={v} invoiceStatus={v.invoice_status} />
              </>
            );
            if (!selecting) {
              return (
                <Link
                  key={v.id}
                  href={`/admin/visits/${v.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-sable transition-colors"
                >
                  {content}
                </Link>
              );
            }
            const isLocked = locked(v);
            return (
              <label
                key={v.id}
                className={`flex items-center gap-3 px-5 py-3 ${isLocked ? "opacity-60" : "cursor-pointer hover:bg-sable"}`}
              >
                <input
                  type="checkbox"
                  className="w-5 h-5 shrink-0"
                  checked={selected.has(v.id)}
                  disabled={isLocked}
                  onChange={() => toggle(v.id)}
                  aria-label={`Sélectionner la visite du ${formatDateFR(v.date)}`}
                />
                <div className="flex items-center justify-between gap-3 flex-1 min-w-0">{content}</div>
              </label>
            );
          })}
        </div>
      )}
      {selecting && visits.some(locked) && (
        <p className="text-[13px] text-pierre mt-3">Les visites déjà facturées (vraie facture) ne peuvent pas être supprimées.</p>
      )}
    </div>
  );
}
