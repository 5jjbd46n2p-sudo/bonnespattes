"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, X } from "@phosphor-icons/react";
import { formatDateFR, computeVisitHours } from "@/lib/utils";

export default function NewInvoiceForm({ clients, settings, preselectedClientId, initialUnbilledVisits }) {
  const router = useRouter();
  const [clientId, setClientId] = useState(preselectedClientId || clients[0]?.id || "");
  const [unbilledVisits, setUnbilledVisits] = useState(initialUnbilledVisits || []);
  const [selectedVisitIds, setSelectedVisitIds] = useState(
    new Set((initialUnbilledVisits || []).map((v) => v.id))
  );
  const [availableDeposits, setAvailableDeposits] = useState([]);
  const [selectedDepositIds, setSelectedDepositIds] = useState(new Set());
  const [manualItems, setManualItems] = useState([]);
  const [tvaRate, setTvaRate] = useState(settings.default_tva_rate || 0);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadClientExtras(id) {
    const [visitsData, depositsData] = await Promise.all([
      fetch(`/api/visits?clientId=${id}&unbilled=1`).then((r) => r.json()),
      fetch(`/api/clients/${id}/deposits?available=1`).then((r) => r.json()),
    ]);
    setUnbilledVisits(visitsData.visits || []);
    setSelectedVisitIds(new Set((visitsData.visits || []).map((v) => v.id)));
    setAvailableDeposits(depositsData.deposits || []);
    setSelectedDepositIds(new Set((depositsData.deposits || []).map((d) => d.id)));
  }

  useEffect(() => {
    if (!clientId) return;
    // Chargement asynchrone : l'état n'est mis à jour qu'après la réponse du serveur.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadClientExtras(clientId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // seulement au chargement initial (client déjà présélectionné)

  function onClientChange(id) {
    setClientId(id);
    loadClientExtras(id);
  }

  function toggleVisit(id) {
    setSelectedVisitIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleDeposit(id) {
    setSelectedDepositIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addManualItem() {
    setManualItems((items) => [...items, { description: "", quantity: 1, unitPrice: 0 }]);
  }

  function updateManualItem(i, field, value) {
    setManualItems((items) => items.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }

  function removeManualItem(i) {
    setManualItems((items) => items.filter((_, idx) => idx !== i));
  }

  const visitItems = unbilledVisits
    .filter((v) => selectedVisitIds.has(v.id))
    .map((v) => {
      // Si la visite a une heure de début/fin, on reporte automatiquement la
      // quantité en heures et le prix unitaire (= tarif horaire effectif) sur
      // la ligne de facturation, plutôt qu'une ligne forfaitaire "x1".
      const total = Number(v.price) || 0;
      const hours = computeVisitHours(v.start_time, v.end_time);
      const quantity = hours && total ? hours : 1;
      const unitPrice = hours && total ? total / hours : total;
      return {
        description: `Visite du ${formatDateFR(v.date)} — ${v.pet_name}${hours ? ` (${hours} h)` : ""}`,
        quantity,
        unitPrice,
      };
    });

  const allItems = [...visitItems, ...manualItems.filter((it) => it.description.trim())];
  const totalHT = allItems.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.unitPrice || 0), 0);
  const totalTVA = totalHT * (Number(tvaRate) / 100);
  const totalTTC = totalHT + totalTVA;
  const depositsApplied = availableDeposits
    .filter((d) => selectedDepositIds.has(d.id))
    .reduce((sum, d) => sum + Number(d.amount), 0);
  const netAPayer = totalTTC - depositsApplied;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!clientId) {
      setError("Choisis un client.");
      return;
    }
    if (allItems.length === 0) {
      setError("Ajoute au moins une ligne (visite ou ligne manuelle).");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        items: allItems,
        tvaRate: Number(tvaRate),
        dueDate: dueDate || null,
        notes,
        visitIds: Array.from(selectedVisitIds),
        depositIds: Array.from(selectedDepositIds),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Erreur lors de la création de la facture.");
      return;
    }
    router.push(`/admin/accounting/invoices/${data.invoice.id}`);
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin/accounting" className="text-sm text-pierre hover:underline inline-flex items-center gap-1.5">
          <ArrowLeft size={20} aria-hidden="true" />
          Retour à la comptabilité
        </Link>
        <h1 className="font-display font-semibold text-encre mt-2">Nouvelle facture</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card p-5 space-y-4">
          <div>
            <label className="label block mb-1">Client</label>
            <select className="input" value={clientId} onChange={(e) => onClientChange(e.target.value)}>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
          </div>

          {unbilledVisits.length > 0 && (
            <div>
              <label className="label block mb-2">Visites non facturées à inclure</label>
              <div className="list-group">
                {unbilledVisits.map((v) => (
                  <label key={v.id} className="list-row text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedVisitIds.has(v.id)}
                      onChange={() => toggleVisit(v.id)}
                    />
                    <span className="flex-1">
                      {formatDateFR(v.date)} — {v.pet_name}
                      {computeVisitHours(v.start_time, v.end_time) && (
                        <span className="text-pierre"> ({computeVisitHours(v.start_time, v.end_time)} h)</span>
                      )}
                    </span>
                    <span className="font-bold tabular-nums">{Number(v.price).toFixed(2)} €</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {availableDeposits.length > 0 && (
            <div>
              <label className="label block mb-2">Acomptes disponibles à déduire</label>
              <div className="list-group">
                {availableDeposits.map((d) => (
                  <label key={d.id} className="list-row text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDepositIds.has(d.id)}
                      onChange={() => toggleDeposit(d.id)}
                    />
                    <span className="flex-1">
                      Acompte du {formatDateFR(d.date)} ({d.method})
                    </span>
                    <span className="font-bold text-mousse tabular-nums">- {Number(d.amount).toFixed(2)} €</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <label className="label">Lignes manuelles</label>
            <button type="button" onClick={addManualItem} className="btn-ghost text-sm !py-1 !px-3">
              <Plus size={20} aria-hidden="true" />
              Ajouter une ligne
            </button>
          </div>
          {manualItems.map((it, i) => (
            <div
              key={i}
              className="flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:items-center border border-trait rounded-lg p-3 sm:border-0 sm:p-0"
            >
              <div className="flex gap-2 sm:contents">
                <input
                  className="input flex-1 sm:col-span-6"
                  placeholder="Description"
                  value={it.description}
                  onChange={(e) => updateManualItem(i, "description", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeManualItem(i)}
                  className="sm:col-span-1 sm:order-last shrink-0 px-2 text-brique flex items-center justify-center"
                  aria-label="Supprimer la ligne"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
              <div className="flex gap-2 sm:contents">
                <input
                  type="number"
                  step="0.01"
                  className="input flex-1 sm:col-span-2"
                  placeholder="Qté"
                  value={it.quantity}
                  onChange={(e) => updateManualItem(i, "quantity", e.target.value)}
                />
                <input
                  type="number"
                  step="0.01"
                  className="input flex-1 sm:col-span-3"
                  placeholder="Prix unit."
                  value={it.unitPrice}
                  onChange={(e) => updateManualItem(i, "unitPrice", e.target.value)}
                />
              </div>
            </div>
          ))}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="label block mb-1">Taux de TVA (%)</label>
              <input type="number" step="0.1" className="input" value={tvaRate} onChange={(e) => setTvaRate(e.target.value)} />
            </div>
            <div>
              <label className="label block mb-1">Échéance</label>
              <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label block mb-1">Notes (visibles sur la facture)</label>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="card p-5 space-y-1 tabular-nums">
          <div className="flex justify-between text-sm">
            <span>Total HT</span>
            <span>{totalHT.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>TVA ({tvaRate}%)</span>
            <span>{totalTVA.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between font-semibold text-lg pt-1 border-t border-trait mt-1">
            <span>Total TTC</span>
            <span>{totalTTC.toFixed(2)} €</span>
          </div>
          {depositsApplied > 0 && (
            <>
              <div className="flex justify-between text-sm text-mousse">
                <span>Acompte(s) déduit(s)</span>
                <span>- {depositsApplied.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between font-semibold text-base pt-1 border-t border-trait mt-1">
                <span>Net à payer</span>
                <span>{netAPayer.toFixed(2)} €</span>
              </div>
            </>
          )}
        </div>

        {error && <p className="text-sm text-brique">{error}</p>}

        <button disabled={loading} className="btn-primary">
          {loading ? "Création..." : "Créer la facture"}
        </button>
      </form>
    </div>
  );
}
