"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash } from "@phosphor-icons/react";

export default function DeleteInvoiceButton({ invoiceId, number, status }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    const sent = status !== "BROUILLON";
    const msg =
      `Supprimer la facture ${number} ?\n\n` +
      "Les visites redeviennent « à facturer » et les acomptes ou crédits utilisés sont rendus." +
      (sent
        ? "\n\nAttention : si cette facture a réellement été remise à un client, ne la supprime pas (les factures doivent se suivre sans trou). Utilise plutôt un avoir."
        : "");
    if (!confirm(msg)) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/invoices/${invoiceId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/accounting");
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.error || "Suppression impossible.");
    setBusy(false);
  }

  return (
    <div className="card p-5 flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h2 className="font-display text-lg font-semibold">Facture de test ?</h2>
        <p className="text-sm text-pierre">Tu peux la supprimer : les visites reviennent dans « à facturer ».</p>
        {error && <p role="alert" className="text-sm font-bold text-brique mt-1">{error}</p>}
      </div>
      <button type="button" onClick={remove} disabled={busy} className="btn-ghost text-sm gap-2 !text-brique">
        <Trash size={20} aria-hidden="true" />
        {busy ? "Suppression..." : "Supprimer"}
      </button>
    </div>
  );
}
