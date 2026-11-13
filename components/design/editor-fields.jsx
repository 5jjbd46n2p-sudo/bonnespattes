"use client";

import { useEffect, useId, useRef, useState } from "react";
import { PALETTE } from "@/lib/designFormats";
import { toHex } from "./editor-utils";

// Petits champs de la barre d'outils de l'éditeur.

// Couleur : palette « carnet de balade » puis sélecteur libre.
export function ColorField({ label, value, onChange, allowNone = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const id = useId();
  const none = !value || value === "transparent" || value === "none";

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="flex h-9 items-center gap-2 rounded-lg border border-trait bg-lin px-2 text-sm hover:bg-sable"
        aria-label={`${label} : ${none ? "aucune" : value}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <span
          className="h-5 w-5 rounded border border-trait"
          style={
            none
              ? { background: "repeating-linear-gradient(45deg, #fffcf7 0 3px, #e3d9c9 3px 6px)" }
              : { background: value }
          }
        />
        <span className="hidden text-pierre lg:inline">{label}</span>
      </button>
      {open && (
        <div id={id} className="modal absolute left-0 top-11 z-30 w-56 p-3" role="dialog" aria-label={label}>
          <p className="label mb-2">{label}</p>
          <div className="grid grid-cols-5 gap-2">
            {PALETTE.map((c) => (
              <button
                key={c.hex}
                type="button"
                title={c.name}
                aria-label={c.name}
                aria-pressed={toHex(value) === c.hex && !none}
                className={`h-8 w-8 rounded border ${
                  toHex(value) === c.hex && !none ? "border-rouille ring-2 ring-rouille" : "border-trait"
                }`}
                style={{ background: c.hex }}
                onClick={() => onChange(c.hex)}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <label className="flex flex-1 items-center gap-2 text-sm text-pierre">
              <input
                type="color"
                className="h-8 w-10 cursor-pointer rounded border border-trait bg-lin"
                value={toHex(value)}
                onChange={(e) => onChange(e.target.value)}
              />
              Autre couleur
            </label>
            {allowNone && (
              <button type="button" className="text-sm font-bold text-rouille" onClick={() => onChange(null)}>
                Aucune
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Nombre saisi au clavier : appliqué dès qu'il est valide, resynchronisé
// depuis l'objet quand le champ n'a pas le focus.
export function NumberField({ label, value, onChange, min, max, step = 1, suffix, width = "w-16" }) {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);

  const apply = (raw) => {
    const n = Number(String(raw).replace(",", "."));
    if (!Number.isFinite(n)) return;
    const v = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
    onChange(v);
  };

  return (
    <label className="flex items-center gap-1 text-sm text-pierre" title={label}>
      <span className="sr-only">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        className={`h-9 ${width} rounded-lg border border-trait bg-lin px-2 text-encre num`}
        value={text}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        onFocus={() => {
          focused.current = true;
        }}
        onBlur={() => {
          focused.current = false;
          setText(String(value));
        }}
        onChange={(e) => {
          setText(e.target.value);
          apply(e.target.value);
        }}
      />
      {suffix && <span aria-hidden="true">{suffix}</span>}
    </label>
  );
}

// Curseur avec libellé visible.
export function RangeField({ label, value, onChange, min, max, step = 1, display }) {
  return (
    <label className="flex items-center gap-2 text-sm text-pierre">
      <span className="whitespace-nowrap">{label}</span>
      <input
        type="range"
        className="w-24 accent-[var(--color-rouille)]"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {display != null && <span className="w-10 text-right text-encre num">{display}</span>}
    </label>
  );
}
