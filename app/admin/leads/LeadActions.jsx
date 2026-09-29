"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LeadActions({ id, status, clientId }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function setStatus(next) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) return setError("Action impossible, réessaie.");
    router.refresh();
  }

  async function convert() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/leads/${id}/convert`, { method: "POST" }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res || !res.ok || !data.clientId) return setError(data.error || "Création du client impossible.");
    router.push(`/admin/clients/${data.clientId}`);
  }

  if (status === "CLIENT") {
    return clientId ? (
      <a href={`/admin/clients/${clientId}`} className="btn-ghost text-sm">
        Ouvrir la fiche client
      </a>
    ) : null;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button onClick={convert} disabled={busy} className="btn-primary text-sm">
          Créer le client
        </button>
        {status === "NOUVEAU" && (
          <button onClick={() => setStatus("CONTACTE")} disabled={busy} className="btn-ghost text-sm">
            Contactée
          </button>
        )}
        {status !== "SANS_SUITE" && (
          <button onClick={() => setStatus("SANS_SUITE")} disabled={busy} className="btn-ghost text-sm">
            Sans suite
          </button>
        )}
        {status === "SANS_SUITE" && (
          <button onClick={() => setStatus("NOUVEAU")} disabled={busy} className="btn-ghost text-sm">
            Remettre en nouvelle
          </button>
        )}
      </div>
      {error && <p role="alert" className="text-sm font-bold text-brique mt-2">{error}</p>}
    </div>
  );
}
