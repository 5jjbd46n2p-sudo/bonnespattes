"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EnvelopeSimple } from "@phosphor-icons/react";

// Envoi de la facture par e-mail au client (PDF en pièce jointe), avec une
// confirmation en ligne (pas de fenêtre confirm()).
export default function SendInvoiceButton({ invoiceId, email, status, emailedAt, emailedTo }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  if (!email) {
    return <p className="text-sm text-pierre">Pas d'adresse e-mail pour ce client : envoi impossible.</p>;
  }

  async function send() {
    setBusy(true);
    setError("");
    setInfo("");
    const res = await fetch(`/api/invoices/${invoiceId}/send`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setConfirming(false);
    if (!res.ok) {
      setError(data.error || "Envoi impossible.");
      return;
    }
    setInfo(`Envoyée à ${data.to}.`);
    router.refresh();
  }

  const last = emailedAt
    ? `Dernier envoi le ${new Date(emailedAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })} à ${emailedTo}.`
    : "Pas encore envoyée par e-mail.";

  return (
    <div className="space-y-2">
      {confirming ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm">
            Envoyer à {email}
            {status === "BROUILLON" ? " ? Le brouillon passera en « Envoyée »." : " ?"}
          </span>
          <button type="button" onClick={send} disabled={busy} className="btn-primary text-sm">
            {busy ? "Envoi..." : "Confirmer l'envoi"}
          </button>
          <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="btn-ghost text-sm">
            Annuler
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="btn-ghost text-sm gap-2">
          <EnvelopeSimple size={20} aria-hidden="true" />
          {emailedAt ? "Renvoyer par e-mail" : "Envoyer par e-mail"}
        </button>
      )}
      <p className="text-[13px] text-pierre">{last}</p>
      {info && <p role="status" className="text-sm text-mousse">{info}</p>}
      {error && <p role="alert" className="text-sm text-brique">{error}</p>}
    </div>
  );
}
