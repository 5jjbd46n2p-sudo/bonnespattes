"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Changement de mot de passe (tous les autres appareils sont déconnectés).
export default function PasswordChangeForm({ forced = false, formal = false }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (next !== confirm) {
      setError("Les deux nouveaux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Une erreur est survenue.");
      return;
    }
    setDone(true);
    setCurrent("");
    setNext("");
    setConfirm("");
    if (forced) {
      router.push(data.redirect || "/");
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-4">
      <div>
        <label htmlFor="pw-current" className="label">
          {forced && formal ? "Mot de passe reçu par email" : "Mot de passe actuel"}
        </label>
        <input id="pw-current" type="password" required autoComplete="current-password" className="input"
          value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div>
        <label htmlFor="pw-new" className="label">Nouveau mot de passe</label>
        <input id="pw-new" type="password" required minLength={12} autoComplete="new-password" className="input"
          value={next} onChange={(e) => setNext(e.target.value)} />
        <p className="text-[13px] text-pierre mt-1">
          12 caractères minimum. Une courte phrase facile à retenir fonctionne très bien.
        </p>
      </div>
      <div>
        <label htmlFor="pw-confirm" className="label">Confirmation</label>
        <input id="pw-confirm" type="password" required autoComplete="new-password" className="input"
          value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {error && <p className="text-sm text-brique" role="alert">{error}</p>}
      {done && !forced && (
        <p className="text-sm text-mousse">
          {formal
            ? "Mot de passe modifié. Vos autres appareils ont été déconnectés."
            : "Mot de passe modifié. Tes autres appareils ont été déconnectés."}
        </p>
      )}
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Enregistrement…" : "Enregistrer le nouveau mot de passe"}
      </button>
    </form>
  );
}
