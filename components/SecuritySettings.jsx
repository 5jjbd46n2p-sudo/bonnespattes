"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PasswordChangeForm from "@/components/PasswordChangeForm";

// Réglages > Sécurité : double authentification (application type Google
// Authenticator) et changement de mot de passe.
export default function SecuritySettings({ totpEnabled }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState(null); // { secret, uri }
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function call(action) {
    setError("");
    setMessage("");
    setLoading(true);
    const res = await fetch("/api/auth/totp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, password, code }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Une erreur est survenue.");
      return null;
    }
    return data;
  }

  async function start(e) {
    e.preventDefault();
    const data = await call("setup");
    if (data) setSetup(data);
  }

  async function enable(e) {
    e.preventDefault();
    const data = await call("enable");
    if (data) {
      setSetup(null);
      setPassword("");
      setCode("");
      setMessage("Double authentification activée. Tes autres appareils ont été déconnectés.");
      router.refresh();
    }
  }

  async function disable(e) {
    e.preventDefault();
    const data = await call("disable");
    if (data) {
      setPassword("");
      setCode("");
      setMessage("Double authentification désactivée.");
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold">Double authentification</h2>
          <p className="text-sm text-pierre mt-1">
            {totpEnabled
              ? "Activée : à chaque connexion, un code de ton application d'authentification t'est demandé en plus du mot de passe."
              : "Fortement conseillée : même si ton mot de passe fuite, personne ne pourra entrer sans ton téléphone."}
          </p>
        </div>

        {totpEnabled ? (
          <form onSubmit={disable} className="space-y-3">
            <p className="text-sm font-bold text-mousse">Activée</p>
            <input type="password" required autoComplete="current-password" className="input"
              placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
            <input inputMode="numeric" required maxLength={7} autoComplete="one-time-code" className="input"
              placeholder="Code à 6 chiffres" value={code} onChange={(e) => setCode(e.target.value)} />
            <button type="submit" disabled={loading} className="btn-ghost">Désactiver</button>
          </form>
        ) : setup ? (
          <form onSubmit={enable} className="space-y-3">
            <ol className="text-sm space-y-2 list-decimal pl-5">
              <li>
                Installe une application d&apos;authentification (Google Authenticator, Microsoft
                Authenticator, 1Password…).
              </li>
              <li>
                Sur ton téléphone,{" "}
                <a href={setup.uri} className="text-rouille underline font-bold">touche ce lien</a> pour
                ajouter le compte. Sinon, saisis cette clé à la main :
                <code className="block mt-1.5 p-2 rounded bg-sable text-encre break-all select-all tracking-wider">
                  {setup.secret.match(/.{1,4}/g).join(" ")}
                </code>
              </li>
              <li>Saisis le code à 6 chiffres affiché par l&apos;application :</li>
            </ol>
            <input inputMode="numeric" required maxLength={7} autoComplete="one-time-code" className="input"
              placeholder="Code à 6 chiffres" value={code} onChange={(e) => setCode(e.target.value)} />
            <button type="submit" disabled={loading} className="btn-primary">Activer</button>
          </form>
        ) : (
          <form onSubmit={start} className="space-y-3">
            <input type="password" required autoComplete="current-password" className="input"
              placeholder="Ton mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="submit" disabled={loading} className="btn-primary">Configurer</button>
          </form>
        )}
        {error && <p className="text-sm text-brique" role="alert">{error}</p>}
        {message && <p className="text-sm text-mousse">{message}</p>}
      </div>

      <div>
        <h2 className="font-display text-xl font-semibold mb-2">Mot de passe</h2>
        <PasswordChangeForm />
      </div>
    </div>
  );
}
