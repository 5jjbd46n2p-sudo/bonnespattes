"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatEUR, formatDateFR } from "@/lib/utils";
import { CircleCheck } from "lucide-react";

export default function PaymentRecorder({ invoiceId, payments, balance }) {
  const router = useRouter();
  const [amount, setAmount] = useState(balance > 0 ? balance.toFixed(2) : "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
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
      <h2 className="font-bold text-forest-dark mb-3">Paiements</h2>
      {payments.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {payments.map((p) => (
            <div key={p.id} className="flex justify-between text-sm border-b border-border pb-1.5">
              <span className="text-muted">
                {formatDateFR(p.date)} · {p.method}
              </span>
              <span className="font-medium">{formatEUR(p.amount)}</span>
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
          {error && <p className="text-sm text-danger">{error}</p>}
          <button disabled={loading} className="btn-primary text-sm w-full">
            {loading ? "Enregistrement…" : "Enregistrer le paiement"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-emerald-700 font-medium inline-flex items-center gap-1.5">
          <CircleCheck className="w-4 h-4" strokeWidth={2} />
          Facture soldée
        </p>
      )}
    </div>
  );
}
