"use client"; // Les limites d'erreur sont des composants client (Next 16)

import { ErrorState } from "@/components/PageStates";

export default function Error({ error, retry }) {
  return <ErrorState digest={error?.digest} onRetry={retry} backHref="/portal" backLabel="Retour à mon espace" />;
}
