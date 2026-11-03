import { formatEUR } from "@/lib/utils";
import { priceRows, fromPrice } from "@/lib/landing";

// Tarifs lus dans les Réglages ; une ligne sans tarif n'est pas affichée.
export default function PriceTable({ settings, area }) {
  const rows = priceRows(settings);
  const from = fromPrice(rows);
  return (
    <section id="tarifs" aria-labelledby="tarifs-titre" className="px-4 py-12 md:py-16 bg-sable scroll-mt-4">
      <div className="max-w-2xl mx-auto">
        <h2 id="tarifs-titre" className="font-display text-2xl md:text-3xl font-semibold">
          Tarifs
        </h2>
        {from !== null && (
          <p className="font-display text-2xl font-semibold text-rouille mt-2">
            À partir de {formatEUR(from)} la visite ou la balade
          </p>
        )}
        {rows.length > 0 && (
          <table className="w-full mt-6 tabular-nums">
            <caption className="sr-only">Tarifs par prestation</caption>
            <tbody className="divide-y divide-trait border-y border-trait">
              {rows.map((r) => (
                <tr key={r.key}>
                  <th scope="row" className="py-3 text-left font-normal text-pierre">
                    {r.label}
                  </th>
                  <td className="py-3 text-right font-bold">{formatEUR(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-4 text-pierre leading-relaxed">
          Je me déplace sur ce secteur : {area}. S'y ajoutent des frais de déplacement selon la distance. Le prix exact vous
          est confirmé avant la première visite.
        </p>
      </div>
    </section>
  );
}
