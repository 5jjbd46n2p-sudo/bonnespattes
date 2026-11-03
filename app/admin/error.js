"use client"; // Les limites d'erreur sont des composants client (Next 16)

import { ErrorState } from "@/components/PageStates";

// Erreur dans l'espace admin : la navigation reste en place, retry() relance la page.
export default function Error({ error, retry }) {
  return <ErrorState digest={error?.digest} onRetry={retry} backHref="/admin" backLabel="Retour à Aujourd'hui" />;
}
