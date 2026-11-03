"use client"; // Les limites d'erreur sont des composants client (Next 16)

import { ErrorState } from "@/components/PageStates";

// Erreur d'affichage d'une page publique. retry() relance le chargement et le
// rendu de la page ; on n'affiche jamais le message technique.
export default function Error({ error, retry }) {
  return (
    <div className="px-4 py-10 max-w-5xl mx-auto w-full">
      <ErrorState digest={error?.digest} onRetry={retry} backHref="/" backLabel="Retour à l'accueil" />
    </div>
  );
}
