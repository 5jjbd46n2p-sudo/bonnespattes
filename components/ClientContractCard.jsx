"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DownloadSimple, PaperPlaneTilt } from "@phosphor-icons/react";

function fmt(d) {
  return new Date(d).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" });
}

export default function ClientContractCard({ clientId, hasEmail, hasLogin = false, signatures = [] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const signed = signatures.find((s) => s.status === "SIGNE");
  const pending = signatures.find((s) => s.status === "ENVOYE" && new Date(s.expires_at) > new Date());
  const expired = !pending && signatures.find((s) => s.status === "ENVOYE");

  let statusText = "Non envoyé";
  if (pending) statusText = `En attente de signature (envoyé le ${fmt(pending.sent_at)})`;
  else if (signed) statusText = `Signé le ${fmt(signed.signed_at)} (v${signed.version})`;
  else if (expired) statusText = `Lien expiré (envoyé le ${fmt(expired.sent_at)})`;

  async function send() {
    if (signed && !confirm("Ce client a déjà signé un contrat. Envoyer une nouvelle version à signer ?")) return;
    setLoading(true);
    setError("");
    setDone(false);
    const res = await fetch(`/api/clients/${clientId}/contract`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Envoi impossible.");
      return;
    }
    setDone(true);
    router.refresh();
  }

  const label = pending || expired ? "Renvoyer" : signed ? "Envoyer une nouvelle version" : "Envoyer le contrat";

  return (
    <div className="card p-5">
      <h2 className="font-display font-semibold text-encre mb-2">Contrat</h2>
      <p className="text-sm text-pierre">{statusText}</p>
      {!hasEmail && <p className="text-sm text-pierre mt-1">Ajoute d'abord l'email du client pour envoyer le contrat.</p>}
      {hasEmail && (
        <p className="text-sm text-pierre mt-1">
          {hasLogin
            ? "Le client signera depuis son espace client (connexion habituelle), sans code à recopier."
            : "Sans espace client, il signera via un lien reçu par email, avec un code de confirmation. Crée-lui d'abord un accès pour une signature plus simple."}
        </p>
      )}
      {error && <p className="text-sm font-bold text-brique mt-2">{error}</p>}
      {done && <p className="text-sm font-bold text-mousse mt-2">Contrat envoyé.</p>}
      <div className="flex flex-wrap gap-2 mt-3">
        <button onClick={send} disabled={loading || !hasEmail} className="btn-primary text-sm gap-2">
          <PaperPlaneTilt size={20} aria-hidden="true" />
          {loading ? "Envoi..." : label}
        </button>
        {signed && (
          <a href={`/api/contracts/${signed.id}/pdf`} className="btn-ghost text-sm gap-2">
            <DownloadSimple size={20} aria-hidden="true" />
            Télécharger le PDF
          </a>
        )}
      </div>
    </div>
  );
}
