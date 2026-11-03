import { Check } from "@phosphor-icons/react/ssr";

// « Pour votre tranquillité » : liste simple à filets. L'assurance n'apparaît que
// si elle est renseignée dans les Réglages (aucune promesse non tenue).
export default function TrustList({ insured = false }) {
  const items = [
    "Un contrat écrit avant la première visite",
    ...(insured ? ["Une assurance responsabilité civile professionnelle"] : []),
    "Une première rencontre gratuite, chez vous",
    "Un devis personnalisé sous 24 h",
  ];
  return (
    <section aria-labelledby="tranquillite" className="px-4 py-12 md:py-16">
      <div className="max-w-2xl mx-auto">
        <h2 id="tranquillite" className="font-display text-2xl md:text-3xl font-semibold mb-6">
          Pour votre tranquillité
        </h2>
        <ul className="divide-y divide-trait border-y border-trait">
          {items.map((t) => (
            <li key={t} className="flex items-center justify-between gap-4 py-4">
              <span>{t}</span>
              <Check size={20} className="text-mousse shrink-0" aria-hidden="true" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
