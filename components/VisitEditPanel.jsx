"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Repeat, Gift } from "@phosphor-icons/react";

export default function VisitEditPanel({ visit }) {
  const router = useRouter();
  const [form, setForm] = useState({
    status: visit.status,
    date: visit.date?.slice?.(0, 10) || visit.date,
    startTime: visit.start_time ? visit.start_time.slice(0, 5) : "",
    endTime: visit.end_time ? visit.end_time.slice(0, 5) : "",
    price: visit.price,
    travelFee: visit.travel_fee ?? 0,
    notes: visit.notes || "",
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isFree, setIsFree] = useState(!!visit.is_free);
  const [freeReason, setFreeReason] = useState(visit.free_reason || "");
  const [offering, setOffering] = useState(false); // formulaire de confirmation ouvert
  const [reasonDraft, setReasonDraft] = useState("");
  const [freeBusy, setFreeBusy] = useState(false);
  const [freeError, setFreeError] = useState("");
  const [removeSeries, setRemoveSeries] = useState(false);

  async function save() {
    setLoading(true);
    await fetch(`/api/visits/${visit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, price: Number(form.price), travelFee: Number(form.travelFee) || 0 }),
    });
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  async function setFree(nextFree, reason) {
    setFreeBusy(true);
    setFreeError("");
    try {
      const res = await fetch(`/api/visits/${visit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFree: nextFree, freeReason: nextFree ? reason : "" }),
      });
      if (!res.ok) throw new Error();
      setIsFree(nextFree);
      setFreeReason(nextFree ? reason : "");
      setOffering(false);
      router.refresh();
    } catch {
      setFreeError("Impossible de modifier l'offre, réessaie.");
    } finally {
      setFreeBusy(false);
    }
  }

  async function remove() {
    const msg = removeSeries
      ? "Supprimer cette visite ainsi que toutes les prochaines visites planifiées de cette série récurrente ?"
      : "Supprimer définitivement cette visite ?";
    if (!confirm(msg)) return;
    const url = `/api/visits/${visit.id}${removeSeries ? "?series=1" : ""}`;
    await fetch(url, { method: "DELETE" });
    router.push(`/admin/clients/${visit.client_id}`);
    router.refresh();
  }

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-encre">Détails de la visite</h2>
        {visit.recurrence_id && (
          <span className="badge text-pierre">
            <Repeat size={20} aria-hidden="true" />
            Visite récurrente
          </span>
        )}
      </div>
      <div>
        <label className="label block mb-1">Statut</label>
        <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="PLANIFIE">Planifiée</option>
          <option value="EN_COURS">En cours</option>
          <option value="FAIT">Terminée</option>
          <option value="ANNULE">Annulée</option>
        </select>
      </div>
      <div>
        <label className="label block mb-1.5">Date et horaires</label>
        <div className="ios-field-group">
          <div className="ios-field-row">
            <span className="ios-field-label">Début</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="pill-input pill-input--date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
              <input
                type="time"
                className="pill-input pill-input--time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
            </div>
          </div>
          <div className="ios-field-row">
            <span className="ios-field-label">Fin</span>
            <div className="flex items-center gap-2">
              <input
                type="time"
                className="pill-input pill-input--time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label block mb-1">Prestation (€)</label>
            <input type="number" step="0.01" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div>
            <label className="label block mb-1">Déplacement (€)</label>
            <input type="number" step="0.01" className="input" value={form.travelFee} onChange={(e) => setForm({ ...form, travelFee: e.target.value })} />
          </div>
        </div>
        <p className="text-[13px] text-pierre mt-1 tabular-nums">
          {isFree
            ? "Visite offerte : compte 0 € dans les totaux."
            : `Montant dû : ${(Number(form.price) + (Number(form.travelFee) || 0)).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}`}
        </p>
      </div>
      <div className="border-t border-trait pt-3">
        {isFree ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm inline-flex items-center gap-2">
              <Gift size={20} aria-hidden="true" />
              <span>
                <span className="font-bold">Offerte</span>
                {freeReason && <span className="text-pierre"> : {freeReason}</span>}
              </span>
            </p>
            <button type="button" onClick={() => setFree(false)} disabled={freeBusy} className="btn-ghost text-sm !py-1.5 !px-3">
              Annuler l'offre
            </button>
          </div>
        ) : offering ? (
          <div className="space-y-2">
            <label className="label block">Motif (facultatif)</label>
            <input
              className="input"
              value={reasonDraft}
              onChange={(e) => setReasonDraft(e.target.value)}
              placeholder="Geste commercial, essai…"
            />
            <p className="text-[13px] text-pierre">Cette visite sera comptée 0 € et apparaîtra « offerte » sur la facture.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setFree(true, reasonDraft.trim())} disabled={freeBusy} className="btn-primary text-sm">
                Confirmer l'offre
              </button>
              <button type="button" onClick={() => setOffering(false)} className="btn-ghost text-sm">
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setOffering(true)} className="btn-ghost text-sm inline-flex items-center gap-2">
            <Gift size={20} aria-hidden="true" />
            Offrir cette visite
          </button>
        )}
        {freeError && <p className="text-sm text-brique mt-2">{freeError}</p>}
      </div>
      <div>
        <label className="label block mb-1">Notes</label>
        <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      {visit.recurrence_id && (
        <label className="flex items-center gap-2 text-[13px] text-pierre">
          <input type="checkbox" checked={removeSeries} onChange={(e) => setRemoveSeries(e.target.checked)} />
          Aussi supprimer les prochaines visites planifiées de cette série récurrente
        </label>
      )}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={loading} className="btn-primary text-sm">
          {loading ? "Enregistrement..." : "Enregistrer"}
        </button>
        {saved && (
          <span className="text-sm font-bold text-mousse inline-flex items-center gap-1.5">
            <Check size={20} aria-hidden="true" />
            Enregistré
          </span>
        )}
        <button onClick={remove} className="text-[13px] font-bold text-brique hover:underline ml-auto">
          Supprimer la visite
        </button>
      </div>
    </div>
  );
}
