"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Warning, Copy } from "@phosphor-icons/react";

// Accès au portail client : Aurore ne choisit ni ne voit aucun mot de passe.
// Le client reçoit un lien d'activation (usage unique, 72 h) pour choisir le sien.
export default function ClientLoginManager({ clientId, login }) {
  const router = useRouter();
  const [editing, setEditing] = useState(!login);
  const [email, setEmail] = useState(login?.email || "");
  const [sendEmail, setSendEmail] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { emailed, emailWarning, link }
  const [copied, setCopied] = useState(false);

  async function issue(targetEmail, { reset = false } = {}) {
    if (
      reset &&
      !confirm(
        "Réinitialiser l'accès ? Le mot de passe actuel ne fonctionnera plus et les sessions ouvertes seront fermées. Le client recevra un nouveau lien pour en choisir un."
      )
    ) {
      return;
    }
    setError("");
    setResult(null);
    setCopied(false);
    setLoading(true);
    const res = await fetch(`/api/clients/${clientId}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail, sendEmail }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Une erreur est survenue.");
      return;
    }
    setResult(data);
    setEditing(false);
    router.refresh();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(result.link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function remove() {
    if (!confirm("Supprimer l'accès de ce client ? Il ne pourra plus se connecter.")) return;
    await fetch(`/api/clients/${clientId}/login`, { method: "DELETE" });
    setResult(null);
    router.refresh();
  }

  const pending = login?.pending_until && !login.pending_expired;
  const expired = login?.pending_until && login.pending_expired;
  const until = login?.pending_until
    ? new Date(login.pending_until).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className="card p-5">
      <h2 className="font-display font-semibold text-encre mb-3">Accès au portail client</h2>

      {result && (
        <div className="bg-sable border border-trait rounded-lg p-3 mb-3 text-sm space-y-1">
          {result.emailed ? (
            <p className="text-mousse font-bold flex items-center gap-1.5">
              <Check size={20} aria-hidden="true" />
              Lien d&apos;activation envoyé par email (valable 72 h).
            </p>
          ) : (
            <>
              {result.emailWarning && (
                <p className="text-brique flex items-start gap-1.5">
                  <Warning size={20} className="shrink-0" aria-hidden="true" />
                  Email non envoyé ({result.emailWarning}).
                </p>
              )}
              <p className="font-bold">Lien à transmettre toi-même au client (valable 72 h, une seule fois) :</p>
              <p className="break-all text-pierre">{result.link}</p>
              <button type="button" onClick={copyLink} className="btn-ghost text-sm gap-2">
                <Copy size={20} aria-hidden="true" />
                {copied ? "Lien copié" : "Copier le lien"}
              </button>
            </>
          )}
        </div>
      )}

      {!editing && login ? (
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            {pending ? (
              <span className="badge text-miel">
                <span className="badge-dot bg-miel" aria-hidden="true" />
                En attente d&apos;activation
              </span>
            ) : expired ? (
              <span className="badge text-brique">
                <span className="badge-dot bg-brique" aria-hidden="true" />
                Lien expiré
              </span>
            ) : (
              <span className="badge text-mousse">
                <span className="badge-dot bg-mousse" aria-hidden="true" />
                Actif
              </span>
            )}
            <p className="text-sm text-pierre mt-1">{login.email}</p>
            {pending && <p className="text-[13px] text-pierre">Lien valable jusqu&apos;au {until}.</p>}
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {pending || expired ? (
              <button onClick={() => issue(login.email)} disabled={loading} className="btn-ghost text-sm">
                {loading ? "Envoi…" : "Renvoyer le lien"}
              </button>
            ) : (
              <button onClick={() => issue(login.email, { reset: true })} disabled={loading} className="btn-ghost text-sm">
                {loading ? "Envoi…" : "Réinitialiser l'accès"}
              </button>
            )}
            <button onClick={() => setEditing(true)} className="text-[13px] font-bold text-encre hover:underline">
              Changer l&apos;email
            </button>
            <button onClick={remove} className="text-[13px] font-bold text-brique hover:underline">
              Supprimer
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            issue(email, { reset: Boolean(login) });
          }}
          className="space-y-3"
        >
          <label className="block">
            <span className="text-[13px] font-bold text-pierre block mb-1">Email de connexion</span>
            <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
            <span className="text-sm">Envoyer le lien d&apos;activation par email</span>
          </label>
          <p className="text-[13px] text-pierre">
            Le client choisira lui-même son mot de passe grâce à ce lien. Aucun mot de passe ne passe par email.
          </p>
          {error && <p className="text-sm text-brique">{error}</p>}
          <div className="flex gap-2">
            <button disabled={loading} className="btn-primary text-sm">
              {loading ? "Envoi…" : login ? "Enregistrer et envoyer un lien" : "Créer l'accès"}
            </button>
            {login && (
              <button type="button" onClick={() => setEditing(false)} className="btn-ghost text-sm">
                Annuler
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
