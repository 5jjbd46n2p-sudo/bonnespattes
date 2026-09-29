"use client";

import { useCallback, useState } from "react";
import Photo from "@/components/landing/Photo";


/** Galerie : la section disparaît tant qu'aucune photo n'est disponible. */
export default function Gallery({ photos = [] }) {
  const [missing, setMissing] = useState(0);
  const onMissing = useCallback(() => setMissing((n) => n + 1), []);
  if (photos.length === 0 || missing >= photos.length) return null;

  return (
    <section aria-labelledby="galerie" className="px-4 py-14 md:py-20">
      <div className="max-w-5xl mx-auto">
        <h2 id="galerie" className="font-display text-2xl md:text-3xl font-semibold mb-6">
          Quelques instants de balade
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
          {photos.map((p) => (
            <Photo key={p.src} src={p.src} alt={p.alt} className="aspect-square" onMissing={onMissing} />
          ))}
        </div>
      </div>
    </section>
  );
}
