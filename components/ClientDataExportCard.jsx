"use client";

import { useState } from "react";
import { DownloadSimple, PaperPlaneTilt } from "@phosphor-icons/react";

export default function ClientDataExportCard({ clientId, email }) {
  const [state, setState] = useState("idle"); // idle | sending | done
  const [error, setError] = useState("");

  async function send() {
    if (!confirm(`Envoyer par email à ${email} le fichier contenant toutes les données de ce client ?`)) return;
    setState("sending");
    setError("");
    const res = await fetch(`/api/clients/${clientId}/export`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setState("done");
    else {
      setError(data.error || "Envoi impossible.");
      setState("idle");
    }
  }

  return (
    <div className="card p-5 space-y-3">
      <div>
        <h2 className="font-display text-xl font-semibold">Données personnelles (RGPD)</h2>
        <p className="text-sm text-pierre">
          Si ce client te demande ses données, tu peux les lui transmettre : profil, animaux, visites, factures,
          contrat.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <a href={`/api/clients/${clientId}/export`} className="btn-ghost text-sm gap-2 !py-1.5 !px-3">
          <DownloadSimple size={20} aria-hidden="true" />
          Télécharger
        </a>
        <button
          type="button"
          onClick={send}
          disabled={!email || state === "sending"}
          className="btn-primary text-sm gap-2 !py-1.5 !px-3 disabled:opacity-50"
        >
          <PaperPlaneTilt size={20} aria-hidden="true" />
          {state === "sending" ? "Envoi..." : "Envoyer par email"}
        </button>
      </div>
      {!email && <p className="text-sm text-pierre">Ajoute d'abord l'email du client pour pouvoir lui envoyer le fichier.</p>}
      {state === "done" && <p role="status" className="text-sm font-bold text-mousse">Fichier envoyé à {email}.</p>}
      {error && <p role="alert" className="text-sm font-bold text-brique">{error}</p>}
    </div>
  );
}
