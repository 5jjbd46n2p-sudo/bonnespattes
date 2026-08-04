"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VisitEditPanel({ visit }) {
  const router = useRouter();
  const [form, setForm] = useState({
    status: visit.status,
    date: visit.date?.slice?.(0, 10) || visit.date,
    startTime: visit.start_time ? visit.start_time.slice(0, 5) : "",
    endTime: visit.end_time ? visit.end_time.slice(0, 5) : "",
    price: visit.price,
    notes: visit.notes || "",
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [removeSeries, setRemoveSeries] = useState(false);

  async function save() {
    setLoading(true);
    await fetch(`/api/visits/${visit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, price: Number(form.price) }),
    });
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
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
        <h2 className="font-semibold text-forest-dark">Détails de la visite</h2>
        {visit.recurrence_id && (
          <span className="badge bg-sand-dark/60 text-forest-dark text-xs">🔁 Visite récurrente</span>
        )}
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Statut</label>
        <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="PLANIFIE">Planifiée</option>
          <option value="EN_COURS">En cours</option>
          <option value="FAIT">Terminée</option>
          <option value="ANNULE">Annulée</option>
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <label className="text-sm font-medium block mb-1">Date</label>
          <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Début</label>
          <input type="time" className="input" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Fin</label>
          <input type="time" className="input" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Prix (€)</label>
        <input type="number" step="0.01" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Notes</label>
        <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      {visit.recurrence_id && (
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={removeSeries} onChange={(e) => setRemoveSeries(e.target.checked)} />
          Aussi supprimer les prochaines visites planifiées de cette série récurrente
        </label>
      )}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={loading} className="btn-primary text-sm">
          {loading ? "Enregistrement..." : "Enregistrer"}
        </button>
        {saved && <span className="text-sm text-forest">✓ Enregistré</span>}
        <button onClick={remove} className="text-xs text-danger hover:underline ml-auto">
          Supprimer la visite
        </button>
      </div>
    </div>
  );
}
