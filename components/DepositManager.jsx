"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatEUR, formatDateFR } from "@/lib/utils";
import { X } from "lucide-react";

export default function DepositManager({ clientId, deposits }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("Virement");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const available = deposits.filter((d) => !d.invoice_id);
  const availableTotal = available.reduce((sum, d) => sum + Number(d.amount), 0);

  async function addDeposit(e) {
    e.preventDefault();
    setError("");
    if (!amount || Number(amount) <= 0) {
      setError("Montant invalide.");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/clients/${clientId}/deposits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), date, method, notes }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erreur lors de l'enregistrement.");
      return;
    }
    setAmount("");
    setNotes("");
    setShowForm(false);
    router.refresh();
  }

  async function removeDeposit(id) {
    if (!confirm("Supprimer cet acompte ?")) return;
    const res = await fetch(`/api/deposits/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Erreur lors de la suppression.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-forest-dark">Acomptes</h2>
        <button onClick={() => setShowForm((s) => !s)} className="text-sm text-forest underline">
          {showForm ? "Annuler" : "+ Enregistrer un acompte"}
        </button>
      </div>

      {availableTotal > 0 && (
        <p className="text-sm mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Disponible : <span className="font-semibold">{formatEUR(availableTotal)}</span>
          <span className="text-muted">, déduit automatiquement de la prochaine facture.</span>
        </p>
      )}

      {showForm && (
        <form onSubmit={addDeposit} className="space-y-2 mb-4 border border-border rounded-lg p-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="0.01"
              className="input"
              placeholder="Montant (€)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option>Virement</option>
            <option>Espèces</option>
            <option>Chèque</option>
            <option>Carte bancaire</option>
            <option>Autre</option>
          </select>
          <input
            className="input"
            placeholder="Note (optionnel)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button disabled={loading} className="btn-primary text-sm w-full">
            {loading ? "Enregistrement…" : "Enregistrer l'acompte"}
          </button>
        </form>
      )}

      {deposits.length === 0 ? (
        <p className="text-sm text-muted">Aucun acompte enregistré pour ce client.</p>
      ) : (
        <div className="space-y-1.5">
          {deposits.map((d) => (
            <div key={d.id} className="flex items-center justify-between text-sm border-b border-border pb-1.5">
              <div>
                <span className="text-muted">
                  {formatDateFR(d.date)} · {d.method}
                </span>
                {d.invoice_id ? (
                  <span className="badge bg-emerald-100 text-emerald-800 text-xs ml-2">
                    Appliqué à {d.invoice_number}
                  </span>
                ) : (
                  <span className="badge bg-amber-100 text-amber-800 text-xs ml-2">Disponible</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-medium">{formatEUR(d.amount)}</span>
                {!d.invoice_id && (
                  <button onClick={() => removeDeposit(d.id)} className="text-muted hover:text-danger p-1" aria-label="Supprimer l'acompte">
                    <X className="w-4 h-4" strokeWidth={2.2} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
