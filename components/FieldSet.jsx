"use client";

import { useId } from "react";
import { WarningCircle } from "@phosphor-icons/react";

/*
 * Groupe de choix étiqueté (lot 1b) : jours de la semaine, durées, type de
 * prestation, pilules de date et d'heure (.field-group). Vrai <fieldset> avec
 * sa <legend>, aux mêmes styles que Field, sans bordure.
 */
export default function FieldSet({ legend, hint, error, className = "", children }) {
  const id = useId();
  const hintId = hint ? `groupe-${id}-aide` : undefined;
  const errorId = error ? `groupe-${id}-erreur` : undefined;
  return (
    <fieldset
      className={`border-0 p-0 m-0 min-w-0 ${className}`}
      aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
      aria-invalid={error ? true : undefined}
    >
      <legend className="label block mb-1 p-0">{legend}</legend>
      {children}
      {hint ? (
        <p id={hintId} className="text-legende text-pierre mt-1">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} aria-live="polite" className="text-legende text-brique mt-1 flex items-center gap-1">
          <WarningCircle size={16} aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
