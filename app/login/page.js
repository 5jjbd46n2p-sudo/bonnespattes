"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, ListChecks, Lock } from "lucide-react";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Une erreur est survenue.");
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
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Présentation du service (bandeau en haut sur mobile, colonne sur ordinateur) */}
      <section className="bg-nav text-white md:w-[44%] px-6 pt-[calc(1.75rem+env(safe-area-inset-top))] pb-8 md:p-12 flex flex-col">
        <Logo light />
        <div className="md:my-auto mt-8">
          <h1 className="font-display text-[1.75rem] md:text-4xl font-bold leading-tight max-w-md">
            Vos animaux restent chez eux. Vous savez comment ils vont.
          </h1>
          <p className="text-white/75 mt-3 max-w-md">
            Chaque visite à domicile est suivie et consignée, pour que vous partiez l&apos;esprit tranquille.
          </p>
          <ul className="mt-8 space-y-4 hidden md:block">
            <Pledge icon={Camera} title="Des photos à chaque passage">
              Vous voyez votre animal le jour même, où que vous soyez.
            </Pledge>
            <Pledge icon={ListChecks} title="Un compte rendu précis">
              Repas, promenade, litière : chaque tâche est cochée sur place.
            </Pledge>
            <Pledge icon={Lock} title="Un espace privé">
              Votre historique et vos factures ne sont visibles que par vous.
            </Pledge>
          </ul>
        </div>
      </section>

      <main className="flex-1 flex items-center justify-center px-5 py-10 md:p-12">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-2xl font-bold text-forest-dark">Connexion</h2>
          <p className="text-muted text-sm mt-1 mb-6">Accédez au suivi de vos visites.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium block mb-1.5">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom.nom@exemple.fr"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium block mb-1.5">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-danger bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>

          <p className="text-sm text-muted mt-6">
            Vos identifiants vous ont été envoyés par email au début de la garde. Mot de passe oublié ?
            Contactez votre pet sitter.
          </p>
          {/* Engagements du service, affichés sous le formulaire sur mobile */}
          <ul className="md:hidden mt-8 pt-6 border-t border-border space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <Camera className="w-[18px] h-[18px] text-forest shrink-0" strokeWidth={1.9} />
              Des photos à chaque passage
            </li>
            <li className="flex items-center gap-3">
              <ListChecks className="w-[18px] h-[18px] text-forest shrink-0" strokeWidth={1.9} />
              Un compte rendu précis de chaque visite
            </li>
            <li className="flex items-center gap-3">
              <Lock className="w-[18px] h-[18px] text-forest shrink-0" strokeWidth={1.9} />
              Un espace privé, visible par vous seul
            </li>
          </ul>

          <p className="text-xs text-muted mt-8">
            <Link href="/mentions-legales" className="hover:text-ink underline underline-offset-2">
              Mentions légales
            </Link>
            <span className="mx-2">·</span>
            <Link href="/confidentialite" className="hover:text-ink underline underline-offset-2">
              Confidentialité
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function Pledge({ icon: Icon, title, children }) {
  return (
    <li className="flex gap-3.5">
      <span className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
        <Icon className="w-[18px] h-[18px] text-ochre" strokeWidth={2} />
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-white/70">{children}</span>
      </span>
    </li>
  );
}
