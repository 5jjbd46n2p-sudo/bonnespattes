"use client";

import { useEffect, useRef, useState } from "react";
import { PawMark } from "@/components/Logo";

/**
 * Photo avec repli propre : tant qu'aucune photo n'est ajoutée (depuis l'admin), on affiche un aplat sable, jamais une image cassée.
 * `onMissing` prévient le parent quand la photo est absente.
 */
export default function Photo({ src, alt, className = "", eager = false, onMissing }) {
  const [missing, setMissing] = useState(!src);
  const ref = useRef(null);

  useEffect(() => {
    const img = ref.current;
    // Erreur survenue avant l'hydratation : onError n'a pas pu se déclencher.
    if (img && img.complete && img.naturalWidth === 0) setMissing(true);
  }, []);

  useEffect(() => {
    if (missing && onMissing) onMissing();
  }, [missing, onMissing]);

  return (
    <div className={`relative overflow-hidden bg-sable rounded-lg ${className}`}>
      {missing ? (
        <div className="absolute inset-0 flex items-center justify-center" role="img" aria-label={alt}>
          <PawMark size={40} className="opacity-25" />
        </div>
      ) : (
        <img
          ref={ref}
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => setMissing(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
    </div>
  );
}
