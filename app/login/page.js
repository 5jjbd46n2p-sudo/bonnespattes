"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // 2e étape (double authentification) : code de l'application d'authentification
  const [mfaStep, setMfaStep] = useState(false);
  const [code, setCode] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(mfaStep ? "/api/auth/mfa" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mfaStep ? { code } : { email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Une erreur est survenue.");
        setLoading(false);
        if (res.status === 401 && mfaStep) {
          setMfaStep(false);
          setCode("");
        }
        return;
      }
      if (data.mfaRequired) {
        setPassword("");
        setMfaStep(true);
        setLoading(false);
        return;
      }
      router.push(data.redirect);
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Logo size={36} className="text-encre" />
          <p className="text-pierre mt-3">
            Les nouvelles de vos compagnons, après chaque visite.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {mfaStep ? (
            <div>
              <label htmlFor="login-code" className="text-[13px] font-bold text-pierre block mb-1">
                Code de vérification
              </label>
              <input
                id="login-code"
                inputMode="numeric"
                pattern="[0-9 ]{6,7}"
                maxLength={7}
                required
                autoFocus
                autoComplete="one-time-code"
                className="input tracking-[0.3em] text-center"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
              />
              <p className="text-[13px] text-pierre mt-1.5">
                Saisis le code à 6 chiffres affiché dans ton application d&apos;authentification.
              </p>
            </div>
          ) : (
          <>
          <div>
            <label htmlFor="login-email" className="text-[13px] font-bold text-pierre block mb-1">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.fr"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="text-[13px] font-bold text-pierre block mb-1">
              Mot de passe
            </label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          </>
          )}
          {error && (
            <p className="text-sm text-brique border border-brique rounded-lg px-3 py-2" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Connexion…" : mfaStep ? "Valider" : "Se connecter"}
          </button>
        </form>
        <p className="text-center text-sm text-pierre mt-6">
          Vos identifiants vous ont été envoyés par email. Un souci pour vous connecter ? Écrivez-moi,
          je vous aide. — Aurore
        </p>
        <p className="text-center text-[13px] text-pierre mt-4">
          <Link href="/mentions-legales" className="underline hover:text-encre">
            Mentions légales
          </Link>
          {" · "}
          <Link href="/confidentialite" className="underline hover:text-encre">
            Confidentialité
          </Link>
        </p>
      </div>
    </div>
  );
}
