import Link from "next/link";

/*
 * États de page partagés (lot 1c) : chargement, erreur, page introuvable.
 * Aucun « use client » ici : ces composants n'utilisent ni état ni effet, ils
 * s'affichent aussi bien depuis un composant serveur (loading.js, not-found.js)
 * que depuis un composant client (error.js, qui passe la fonction retry).
 */

// Blocs sable statiques (sans animation) qui imitent un titre et trois lignes
// de liste, pendant que le contenu arrive.
export function LoadingBlocks() {
  return (
    <div role="status" aria-live="polite" className="max-w-2xl space-y-4">
      <span className="sr-only">Chargement…</span>
      <div aria-hidden="true" className="h-8 w-48 rounded-lg bg-sable" />
      <div aria-hidden="true" className="rounded-lg border border-trait bg-lin overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`px-4 py-3 ${i ? "border-t border-trait" : ""}`}>
            <div className="h-4 w-2/3 rounded bg-sable" />
            <div className="mt-2 h-3 w-1/3 rounded bg-sable" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Erreur d'affichage : jamais le message technique, seulement la référence
// (digest) qui permet de retrouver l'erreur dans les journaux Vercel.
export function ErrorState({ digest, onRetry, backHref, backLabel }) {
  return (
    <div className="max-w-xl py-6 space-y-4">
      <h1 className="font-display text-2xl md:text-3xl font-semibold">Cette page n&apos;a pas pu s&apos;afficher.</h1>
      <div className="flex flex-col sm:flex-row gap-3">
        <button type="button" onClick={() => onRetry?.()} className="btn-primary">
          Réessayer
        </button>
        <Link href={backHref} className="btn-ghost">
          {backLabel}
        </Link>
      </div>
      {digest ? <p className="text-[13px] text-pierre">Référence : {digest}</p> : null}
    </div>
  );
}

// Page introuvable : un titre, un texte facultatif, un ou deux liens.
export function NotFoundState({ title, text, links = [] }) {
  return (
    <div className="max-w-xl py-6 space-y-4">
      <h1 className="font-display text-2xl md:text-3xl font-semibold">{title}</h1>
      {text ? <p className="text-pierre leading-relaxed">{text}</p> : null}
      <div className="flex flex-col sm:flex-row gap-3">
        {links.map((l, i) => (
          <Link key={l.href} href={l.href} className={i === 0 ? "btn-primary" : "btn-ghost"}>
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
