"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilePdf, PaperPlaneTilt, Trash } from "@phosphor-icons/react";
import { formatDateFR, formatEUR } from "@/lib/utils";

const STATUS = {
  EN_ATTENTE: { label: "En attente", cls: "text-pierre" },
  ACCEPTE: { label: "Accepté", cls: "text-mousse" },
  REFUSE: { label: "Refusé", cls: "text-brique" },
};

const lineTotal = (v) => (v.is_free ? 0 : (Number(v.price) || 0) + (Number(v.travel_fee) || 0));

export default function ClientQuotesCard({ clientId, email, plannedVisits, quotes }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(() => new Set(plannedVisits.map((v) => v.id)));
  const [message, setMessage] = useState("");
  const [send, setSend] = useState(Boolean(email));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const total = plannedVisits.filter((v) => selected.has(v.id)).reduce((s, v) => s + lineTotal(v), 0);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function create() {
    setBusy(true);
    setError("");
    setInfo("");
    const res = await fetch(`/api/clients/${clientId}/quotes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitIds: [...selected], message, send }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setOpen(false);
      setMessage("");
      setInfo(
        data.emailed
          ? `Devis ${data.quote.number} envoyé à ${email}.`
          : data.emailError
            ? `Devis ${data.quote.number} créé, mais l'envoi a échoué : ${data.emailError}`
            : `Devis ${data.quote.number} créé.`
      );
      router.refresh();
    } else setError(data.error || "Création impossible.");
    setBusy(false);
  }

  async function call(url, method, body, okMsg) {
    setBusy(true);
    setError("");
    setInfo("");
    const res = await fetch(url, {
      method,
      ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      if (okMsg) setInfo(okMsg);
      router.refresh();
    } else setError(data.error || "Action impossible.");
    setBusy(false);
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-semibold">Devis</h2>
          <p className="text-sm text-pierre">Choisis des visites planifiées et envoie le prix au client.</p>
        </div>
        {!open && (
          <button type="button" onClick={() => setOpen(true)} disabled={plannedVisits.length === 0} className="btn-primary text-sm disabled:opacity-50">
            Nouveau devis
          </button>
        )}
      </div>
      {plannedVisits.length === 0 && !open && (
        <p className="text-sm text-pierre">Aucune visite planifiée à chiffrer. Planifie d'abord les visites demandées.</p>
      )}

      {open && (
        <div className="space-y-3 border border-trait rounded-lg p-4">
          <p className="label">Visites à inclure</p>
          <ul className="divide-y divide-trait">
            {plannedVisits.map((v) => (
              <li key={v.id}>
                <label className="flex items-center gap-3 py-2 cursor-pointer">
                  <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggle(v.id)} />
                  <span className="flex-1 text-sm">
                    {formatDateFR(v.date)} · {v.pet_name}
                    {v.start_time ? ` · ${String(v.start_time).slice(0, 5)}` : ""}
                  </span>
                  <span className="text-sm tabular-nums font-medium">{formatEUR(lineTotal(v))}</span>
                </label>
              </li>
            ))}
          </ul>
          <p className="text-right font-bold tabular-nums">Total : {formatEUR(total)}</p>
          <label className="block">
            <span className="label">Message pour le client (facultatif, dans l'e-mail seulement, pas sur le devis)</span>
            <textarea className="input mt-1" rows={3} maxLength={3000} value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={send} disabled={!email} onChange={(e) => setSend(e.target.checked)} />
            <span className="text-sm font-bold">{email ? `Envoyer par e-mail à ${email}` : "Pas d'e-mail pour ce client : PDF seulement"}</span>
          </label>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={create} disabled={busy || selected.size === 0} className="btn-primary text-sm">
              {busy ? "..." : send ? "Créer et envoyer" : "Créer le devis"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-sm">
              Annuler
            </button>
          </div>
        </div>
      )}

      {quotes.length > 0 && (
        <ul className="divide-y divide-trait">
          {quotes.map((q) => {
            const st = STATUS[q.status] || STATUS.EN_ATTENTE;
            return (
              <li key={q.id} className="py-3 space-y-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="font-bold tabular-nums">{q.number}</span>
                  <span className="text-sm tabular-nums">{formatEUR(q.total_ttc)}</span>
                  <span className={`text-sm font-bold ${st.cls}`}>{st.label}</span>
                </div>
                <p className="text-[13px] text-pierre">
                  Émis le {formatDateFR(q.issue_date)}
                  {q.valid_until ? `, valable jusqu'au ${formatDateFR(q.valid_until)}` : ""}
                  {q.sent_at ? ` · envoyé à ${q.sent_to}` : " · non envoyé"}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <a href={`/api/quotes/${q.id}/pdf`} target="_blank" rel="noreferrer" className="btn-ghost text-sm gap-1.5 !py-1 !px-3">
                    <FilePdf size={20} aria-hidden="true" />
                    PDF
                  </a>
                  {email && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => confirm(`Envoyer le devis ${q.number} à ${email} ?`) && call(`/api/quotes/${q.id}/send`, "POST", null, `Devis ${q.number} envoyé à ${email}.`)}
                      className="btn-ghost text-sm gap-1.5 !py-1 !px-3"
                    >
                      <PaperPlaneTilt size={20} aria-hidden="true" />
                      {q.sent_at ? "Renvoyer" : "Envoyer"}
                    </button>
                  )}
                  {q.status === "EN_ATTENTE" && (
                    <>
                      <button type="button" disabled={busy} onClick={() => call(`/api/quotes/${q.id}`, "PATCH", { status: "ACCEPTE" }, `Devis ${q.number} accepté.`)} className="btn-primary text-sm !py-1 !px-3">
                        Accepté
                      </button>
                      <button type="button" disabled={busy} onClick={() => call(`/api/quotes/${q.id}`, "PATCH", { status: "REFUSE" })} className="btn-ghost text-sm !py-1 !px-3">
                        Refusé
                      </button>
                    </>
                  )}
                  {q.status !== "EN_ATTENTE" && (
                    <button type="button" disabled={busy} onClick={() => call(`/api/quotes/${q.id}`, "PATCH", { status: "EN_ATTENTE" })} className="text-sm text-rouille underline">
                      Remettre en attente
                    </button>
                  )}
                  {q.status !== "ACCEPTE" && (
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`Supprimer le devis ${q.number}`}
                      onClick={() => confirm(`Supprimer le devis ${q.number} ?`) && call(`/api/quotes/${q.id}`, "DELETE")}
                      className="text-brique p-1"
                    >
                      <Trash size={20} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {info && <p role="status" className="text-sm font-bold text-mousse">{info}</p>}
      {error && <p role="alert" className="text-sm font-bold text-brique">{error}</p>}
    </div>
  );
}
