"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PasswordChangeForm from "@/components/PasswordChangeForm";

// Réglages > Sécurité : double authentification (application type Google
// Authenticator) et changement de mot de passe.
export default function SecuritySettings({ totpEnabled, backupCodesLeft = 0 }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState(null); // { secret, uri }
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  // Codes de secours affichés une seule fois, après activation ou régénération.
  const [codes, setCodes] = useState(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

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
      setCodes(data.backupCodes || []);
      setSaved(false);
      setMessage("Double authentification activée. Tes autres appareils ont été déconnectés.");
    }
  }

  async function regenerate(e) {
    e.preventDefault();
    const data = await call("regenerate-codes");
    if (data) {
      setPassword("");
      setCode("");
      setRegenerating(false);
      setCodes(data.backupCodes || []);
      setSaved(false);
      setMessage("Nouveaux codes de secours créés : les anciens ne fonctionnent plus.");
    }
  }

  async function copyCodes() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function closeCodes() {
    setCodes(null);
    setCopied(false);
    router.refresh();
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

        {codes ? (
          <div className="space-y-3">
            <p className="text-sm font-bold">Tes codes de secours</p>
            <p className="text-sm text-pierre">
              Chaque code sert une seule fois, si tu n&apos;as plus ton téléphone. Ils ne seront plus jamais
              affichés : range-les dans ton gestionnaire de mots de passe ou imprime-les.
            </p>
            <ul className="grid grid-cols-2 gap-2 p-3 rounded bg-sable font-mono text-[15px] tracking-wider select-all">
              {codes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <button type="button" onClick={copyCodes} className="btn-ghost">
              {copied ? "Copiés" : "Copier les codes"}
            </button>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
              J&apos;ai mis ces codes en lieu sûr
            </label>
            <button type="button" onClick={closeCodes} disabled={!saved} className="btn-primary">
              Terminé
            </button>
          </div>
        ) : totpEnabled && regenerating ? (
          <form onSubmit={regenerate} className="space-y-3">
            <p className="text-sm text-pierre">Les anciens codes de secours cesseront de fonctionner.</p>
            <input type="password" required autoComplete="current-password" className="input"
              placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
            <input inputMode="numeric" required maxLength={7} autoComplete="one-time-code" className="input"
              placeholder="Code à 6 chiffres" value={code} onChange={(e) => setCode(e.target.value)} />
            <div className="flex gap-2 flex-wrap">
              <button type="submit" disabled={loading} className="btn-primary">Générer de nouveaux codes</button>
              <button type="button" onClick={() => setRegenerating(false)} className="btn-ghost">Annuler</button>
            </div>
          </form>
        ) : totpEnabled ? (
          <form onSubmit={disable} className="space-y-3">
            <p className="text-sm font-bold text-mousse">Activée</p>
            <p className="text-sm text-pierre">
              {backupCodesLeft > 0
                ? `Codes de secours restants : ${backupCodesLeft} sur 10.`
                : "Aucun code de secours disponible : génères-en avant d'en avoir besoin."}{" "}
              <button type="button" onClick={() => setRegenerating(true)} className="text-rouille underline font-bold">
                Générer de nouveaux codes
              </button>
            </p>
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
