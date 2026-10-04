"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash } from "@phosphor-icons/react";

export default function DeleteInvoiceButton({ invoiceId, clientId = null, number, status, isTest, isCreditNote = false, creditNoteNumber = null }) {
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

  async function markTest() {
    if (!confirm(`Passer la facture ${number} en facture de test ?\n\nElle prendra un numéro FT, ne sera plus comptée dans la comptabilité, et ta suite de vraies factures se referme.`)) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isTest: true }),
    });
    if (res.ok) {
      router.refresh();
      setBusy(false);
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.error || "Impossible de modifier la facture.");
    setBusy(false);
  }

  async function creditNote() {
    if (!confirm(`Annuler la facture ${number} par un avoir ?\n\nUn avoir (montants négatifs) sera créé avec le prochain numéro. La facture reste conservée, ses visites redeviennent « à facturer ». Un remboursement éventuel se fait à part.`)) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/invoices/${invoiceId}/credit-note`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.creditNote) {
      router.push(`/admin/accounting/invoices/${data.creditNote.id}`);
      router.refresh();
      return;
    }
    setError(data.error || "Création de l'avoir impossible.");
    setBusy(false);
  }

  // Annule et remplace : avoir sur la facture erronée, puis nouvelle facture préremplie pour ce client.
  async function replace() {
    if (!confirm(`Annuler et remplacer la facture ${number} ?\n\n1. Un avoir annule la facture ${number} (elle reste conservée).\n2. Ses visites redeviennent « à facturer » et tu arrives sur une nouvelle facture à corriger.\n\nSi le client avait déjà payé, le remboursement ou le report du paiement se gère à part.`)) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/invoices/${invoiceId}/credit-note`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.creditNote) {
      router.push(`/admin/accounting/invoices/new?clientId=${clientId}&remplace=${encodeURIComponent(number)}&avoir=${encodeURIComponent(data.creditNote.number)}`);
      router.refresh();
      return;
    }
    setError(data.error || "Création de l'avoir impossible.");
    setBusy(false);
  }

  // Facture émise : ni suppression ni passage en test (obligation légale).
  if (!isTest && status !== "BROUILLON") {
    return (
      <div className="card p-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-lg font-semibold">{isCreditNote ? "Avoir" : "Facture émise"}</h2>
          <p className="text-sm text-pierre">
            {isCreditNote
              ? "Un avoir se conserve comme une facture : il ne peut pas être supprimé."
              : creditNoteNumber
                ? `Annulée par l'avoir ${creditNoteNumber}. Elle reste conservée (obligation légale).`
                : "Une facture envoyée ne se supprime pas (conservation 10 ans, numérotation continue). Pour l'annuler, crée un avoir."}
          </p>
          {error && <p role="alert" className="text-sm font-bold text-brique mt-1">{error}</p>}
        </div>
        {!isCreditNote && !creditNoteNumber && (
          <div className="flex items-center gap-2 flex-wrap">
            {clientId && (
              <button type="button" onClick={replace} disabled={busy} className="btn-primary text-sm">
                {busy ? "..." : "Annuler et remplacer"}
              </button>
            )}
            <button type="button" onClick={creditNote} disabled={busy} className="btn-ghost text-sm">
              {busy ? "..." : "Annuler par un avoir"}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card p-5 flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h2 className="font-display text-lg font-semibold">{isTest ? "Facture de test" : "Facture de test ?"}</h2>
        <p className="text-sm text-pierre">
          {isTest
            ? "Numéro FT, non comptée. Tu peux la supprimer : les visites reviennent dans « à facturer »."
            : "Passe-la en test (numéro FT) ou supprime-la : les visites reviennent dans « à facturer »."}
        </p>
        {error && <p role="alert" className="text-sm font-bold text-brique mt-1">{error}</p>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {!isTest && (
          <button type="button" onClick={markTest} disabled={busy} className="btn-ghost text-sm">
            Marquer comme test
          </button>
        )}
        <button type="button" onClick={remove} disabled={busy} className="btn-ghost text-sm gap-2 !text-brique">
          <Trash size={20} aria-hidden="true" />
          {busy ? "..." : "Supprimer"}
        </button>
      </div>
    </div>
  );
}
