"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "@phosphor-icons/react";
import { todayISO } from "@/lib/utils";

export default function MarkPaidButton({ invoiceId, balance, number }) {
  const router = useRouter();
  const [method, setMethod] = useState("Virement");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function markPaid() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(Number(balance).toFixed(2)),
          date: todayISO(),
          method,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erreur.");
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <select
          className="input !w-auto text-sm !py-1"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          aria-label={`Mode de paiement de la facture ${number}`}
        >
          <option>Virement</option>
          <option>Espèces</option>
          <option>Chèque</option>
          <option>Carte bancaire</option>
          <option>Autre</option>
        </select>
        <button type="button" onClick={markPaid} disabled={loading || balance <= 0} className="btn-primary text-sm !py-1 !px-3 gap-1.5">
          <Check size={20} aria-hidden="true" />
          {loading ? "..." : "Marquer payée"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-brique">
          {error}
        </p>
      )}
    </div>
  );
}
