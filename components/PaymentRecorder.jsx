"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "@phosphor-icons/react";
import { formatEUR, formatDateFR, todayISO } from "@/lib/utils";

export default function PaymentRecorder({ invoiceId, payments, balance }) {
  const router = useRouter();
  const [amount, setAmount] = useState(balance > 0 ? balance.toFixed(2) : "");
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState("Virement");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function addPayment(e) {
    e.preventDefault();
    setError("");
    if (!amount || Number(amount) <= 0) {
      setError("Montant invalide.");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), date, method }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erreur.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="card p-5">
      <h2 className="font-display font-semibold text-encre mb-3">Paiements</h2>
      {payments.length > 0 && (
        <div className="divide-y divide-trait border-y border-trait mb-4">
          {payments.map((p) => (
            <div key={p.id} className="flex justify-between gap-3 text-sm py-2.5">
              <span className="text-pierre tabular-nums">
                {formatDateFR(p.date)} · {p.method}
              </span>
              <span className="font-bold tabular-nums">{formatEUR(p.amount)}</span>
            </div>
          ))}
        </div>
      )}
      {balance > 0 ? (
        <form onSubmit={addPayment} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="0.01"
              className="input"
              placeholder="Montant"
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
          {error && <p className="text-sm text-brique">{error}</p>}
          <button disabled={loading} className="btn-primary text-sm w-full">
            {loading ? "Enregistrement..." : "Enregistrer le paiement"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-mousse font-bold flex items-center gap-1.5">
          <Check size={20} aria-hidden="true" />
          Facture soldée
        </p>
      )}
    </div>
  );
}
