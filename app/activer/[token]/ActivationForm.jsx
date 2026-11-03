"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";

// Formulaire de choix du mot de passe (lien d'activation). Les règles sont
// vérifiées par le serveur (passwordProblem) ; ici, seulement la confirmation.
export default function ActivationForm({ token, email, minLength }) {
  const router = useRouter();
  const id = useId();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/activation/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Une erreur est survenue. Réessayez dans un instant.");
      return;
    }
    router.push(data.redirect || "/portal");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <p className="text-[13px] font-bold text-pierre">Identifiant</p>
        <p className="text-encre">{email}</p>
      </div>
      <div>
        <label htmlFor={`${id}-pw`} className="text-[13px] font-bold text-pierre block mb-1">
          Mot de passe
        </label>
        <input
          id={`${id}-pw`}
          type="password"
          autoComplete="new-password"
          required
          minLength={minLength}
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby={`${id}-hint`}
        />
        <p id={`${id}-hint`} className="text-[13px] text-pierre mt-1">
          {minLength} caractères au moins. Une courte phrase facile à retenir convient très bien.
        </p>
      </div>
      <div>
        <label htmlFor={`${id}-confirm`} className="text-[13px] font-bold text-pierre block mb-1">
          Confirmez le mot de passe
        </label>
        <input
          id={`${id}-confirm`}
          type="password"
          autoComplete="new-password"
          required
          className="input"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-brique">
          {error}
        </p>
      )}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Activation…" : "Activer mon espace"}
      </button>
    </form>
  );
}
