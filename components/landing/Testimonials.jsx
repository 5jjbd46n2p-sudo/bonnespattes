// « Ils me font confiance » : avis publiés depuis l'admin ; rien n'est affiché s'il n'y en a aucun.
export default function Testimonials({ items = [] }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="avis" className="px-4 py-12 md:py-16">
      <div className="max-w-2xl mx-auto">
        <h2 id="avis" className="font-display text-2xl md:text-3xl font-semibold mb-6">
          Ils me font confiance
        </h2>
        <ul className="divide-y divide-trait border-y border-trait">
          {items.map((t) => (
            <li key={t.id} className="py-6">
              <blockquote className="leading-relaxed whitespace-pre-line">« {t.body} »</blockquote>
              <p className="mt-3 text-sm text-pierre">
                <span className="font-bold text-encre">{t.author}</span>
                {t.detail ? `, ${t.detail}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
