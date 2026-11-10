"use client";

import { useEffect, useState } from "react";
import { UNITS_PER_MM, PALETTE } from "@/lib/designFormats";

// Points → unités de conception (24 pt ≈ 85 unités).
export const ptToUnits = (pt) => Math.round(pt * (25.4 / 72) * UNITS_PER_MM * 10) / 10;

// Taille de référence des nouveaux objets : 40 % du plus petit côté de la zone de sécurité.
export const baseSize = (fmt) => (fmt ? Math.min(fmt.safeRect.w, fmt.safeRect.h) * 0.4 : 200);

export const RUST = "#a8481f";
export const INK = "#1f1a15";

const typeOf = (o) => String(o?.type || "").toLowerCase();
export const isType = (o, ...types) => types.includes(typeOf(o));

// Objet sélectionné sur la toile (null si aucun ou sélection multiple).
export function useActiveObject(canvas) {
  const [active, setActive] = useState(null);
  useEffect(() => {
    if (!canvas) return undefined;
    const update = () => {
      const o = canvas.getActiveObject?.() || null;
      setActive(o && !isType(o, "activeselection") ? o : null);
    };
    update();
    const events = ["selection:created", "selection:updated", "selection:cleared", "object:removed"];
    for (const e of events) canvas.on(e, update);
    return () => {
      for (const e of events) canvas.off(e, update);
    };
  }, [canvas]);
  return active;
}

export function PanelTitle({ children, hint }) {
  return (
    <div className="mb-3">
      <h2 className="font-display text-lg font-semibold text-encre">{children}</h2>
      {hint && <p className="text-sm text-pierre mt-1">{hint}</p>}
    </div>
  );
}

export function ErrorText({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-sm text-brique mt-2">
      {children}
    </p>
  );
}

export function WaitingCanvas() {
  return <p className="text-sm text-pierre">Chargement de la toile…</p>;
}

// Nuancier de la palette « carnet de balade ».
export function Swatches({ value, onChange, label = "Couleur" }) {
  return (
    <fieldset>
      <legend className="label mb-1.5">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {PALETTE.map((c) => {
          const selected = String(value).toLowerCase() === c.hex.toLowerCase();
          return (
            <button
              key={c.hex}
              type="button"
              onClick={() => onChange(c.hex)}
              aria-label={c.name}
              aria-pressed={selected}
              title={c.name}
              className={`h-7 w-7 rounded-full border border-trait focus-visible:outline-2 focus-visible:outline-rouille ${
                selected ? "ring-2 ring-rouille ring-offset-2 ring-offset-lin" : ""
              }`}
              style={{ background: c.hex }}
            />
          );
        })}
      </div>
    </fieldset>
  );
}
