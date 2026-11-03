"use client";

import { Children, cloneElement, isValidElement, useId } from "react";
import { WarningCircle } from "@phosphor-icons/react";

/*
 * Champ de formulaire étiqueté (lot 1b) :
 *   <Field label="Nom" hint="…" error={erreur} required>
 *     <input className="input" … />
 *   </Field>
 * Le libellé est relié au champ (htmlFor / id), l'aide et l'erreur par
 * aria-describedby, aria-invalid est posé en cas d'erreur, et l'erreur est
 * annoncée aux lecteurs d'écran. Un seul enfant : input, select ou textarea.
 */
export default function Field({ label, hint, error, required = false, className = "", children }) {
  const autoId = useId();
  const child = Children.only(children);
  if (!isValidElement(child)) throw new Error("Field attend un seul élément input, select ou textarea.");

  const id = child.props.id || `champ-${autoId}`;
  const hintId = hint ? `${id}-aide` : null;
  const errorId = error ? `${id}-erreur` : null;
  const describedBy = [child.props["aria-describedby"], hintId, errorId].filter(Boolean).join(" ") || undefined;

  const field = cloneElement(child, {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : child.props["aria-invalid"],
    required: required || child.props.required,
  });

  return (
    <div className={className}>
      <label htmlFor={id} className="label block mb-1">
        {label}
        {required ? <span className="font-normal"> (obligatoire)</span> : null}
      </label>
      {field}
      {hint ? (
        <p id={hintId} className="text-legende text-pierre mt-1">
          {hint}
        </p>
      ) : null}
      <p id={errorId || undefined} aria-live="polite" className={error ? "text-legende text-brique mt-1 flex items-center gap-1" : "sr-only"}>
        {error ? (
          <>
            <WarningCircle size={16} aria-hidden="true" />
            {error}
          </>
        ) : null}
      </p>
    </div>
  );
}
