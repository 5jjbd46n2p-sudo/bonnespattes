"use client";

import { useCallback, useState } from "react";
import Photo from "@/components/landing/Photo";

// Tailles volontairement inégales : une bande de photos, pas une grille de vignettes.
const SHAPES = [
  "w-56 aspect-[4/5] md:w-auto",
  "w-40 aspect-square mt-8 md:mt-0 md:w-auto",
  "w-56 aspect-[4/5] md:w-auto md:aspect-[4/3]",
  "w-40 aspect-[3/4] mt-6 md:mt-0 md:w-auto md:aspect-square",
  "w-56 aspect-[4/5] md:w-auto md:aspect-[4/3]",
  "w-40 aspect-square mt-8 md:mt-0 md:w-auto",
];

/** Galerie : la section disparaît tant qu'aucune photo n'est disponible. */
export default function Gallery({ photos = [] }) {
  const [missing, setMissing] = useState(0);
  const onMissing = useCallback(() => setMissing((n) => n + 1), []);
  if (photos.length === 0 || missing >= photos.length) return null;

  return (
    <section aria-labelledby="galerie" className="py-12 md:py-16">
      <h2 id="galerie" className="font-display text-2xl md:text-3xl font-semibold mb-6 px-4 max-w-5xl mx-auto">
        Instants de balade
      </h2>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 items-start md:grid md:grid-cols-3 md:overflow-visible md:max-w-5xl md:mx-auto">
        {photos.map((p, i) => (
          <Photo key={p.src} src={p.src} alt={p.alt} className={`shrink-0 ${SHAPES[i % SHAPES.length]}`} onMissing={onMissing} />
        ))}
      </div>
    </section>
  );
}
