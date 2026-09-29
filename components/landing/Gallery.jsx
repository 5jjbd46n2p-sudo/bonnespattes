"use client";

import { useCallback, useState } from "react";
import Photo from "@/components/landing/Photo";

const PHOTOS = [
  { src: "/photos/gallery-1.jpg", alt: "Un chien à hauteur d'yeux, en promenade sur un chemin de campagne" },
  { src: "/photos/gallery-2.jpg", alt: "Un chien qui court dans l'herbe parmi les feuilles d'automne" },
  { src: "/photos/gallery-3.jpg", alt: "Un chat installé sur un rebord de fenêtre, au calme" },
  { src: "/photos/gallery-4.jpg", alt: "Un chien au pelage miel qui regarde l'objectif" },
  { src: "/photos/gallery-5.jpg", alt: "Une balade en forêt avec un chien en laisse" },
  { src: "/photos/gallery-6.jpg", alt: "Un chat curieux dans un jardin" },
];

/** Galerie : la section disparaît tant qu'aucune photo n'est disponible. */
export default function Gallery() {
  const [missing, setMissing] = useState(0);
  const onMissing = useCallback(() => setMissing((n) => n + 1), []);
  if (missing >= PHOTOS.length) return null;

  return (
    <section aria-labelledby="galerie" className="px-4 py-14 md:py-20">
      <div className="max-w-5xl mx-auto">
        <h2 id="galerie" className="font-display text-2xl md:text-3xl font-semibold mb-6">
          Quelques instants de balade
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
          {PHOTOS.map((p) => (
            <Photo key={p.src} src={p.src} alt={p.alt} className="aspect-square" onMissing={onMissing} />
          ))}
        </div>
      </div>
    </section>
  );
}
