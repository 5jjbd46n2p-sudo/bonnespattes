"use client";

import { Textbox } from "fabric";
import { useEditor } from "../EditorContext";
import { browserFontResolver } from "@/lib/designFonts";
import { PanelTitle, WaitingCanvas, ptToUnits, INK } from "./common";

// Tailles en points (spec) ; largeur en part de la zone de sécurité.
const PRESETS = [
  { id: "title", label: "Titre", sample: "Ajouter un titre", text: "Ton titre", font: "Fraunces", weight: 600, pt: 24, width: 0.8, lineHeight: 1.1, className: "font-display text-2xl font-semibold" },
  { id: "subtitle", label: "Sous-titre", sample: "Ajouter un sous-titre", text: "Ton sous-titre", font: "Fraunces", weight: 600, pt: 14, width: 0.8, lineHeight: 1.15, className: "font-display text-lg font-semibold" },
  { id: "paragraph", label: "Paragraphe", sample: "Ajouter un paragraphe", text: "Ton texte ici. Double-clique pour le modifier.", font: "Atkinson Hyperlegible", weight: 400, pt: 9, width: 0.6, lineHeight: 1.3, className: "font-body text-base" },
];

export default function TextPanel() {
  const { canvas, fmt, addObject } = useEditor();

  function add(p) {
    const resolver = browserFontResolver();
    const width = Math.round((fmt?.safeRect.w ?? 600) * p.width);
    const box = new Textbox(p.text, {
      width,
      fontFamily: resolver.toRuntime(p.font),
      fontWeight: p.weight,
      fontStyle: "normal",
      fontSize: ptToUnits(p.pt),
      lineHeight: p.lineHeight,
      charSpacing: 0,
      fill: INK,
      textAlign: "left",
      splitByGrapheme: false,
      abpRole: "text",
      abpLocked: false,
    });
    addObject(box);
  }

  if (!canvas) return <WaitingCanvas />;

  return (
    <div>
      <PanelTitle hint="Clique pour ajouter, puis double-clique sur la toile pour écrire.">Textes</PanelTitle>
      <ul className="grid gap-2">
        {PRESETS.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => add(p)}
              className="w-full rounded-lg border border-trait bg-lin hover:bg-sable px-3 py-3 text-left text-encre focus-visible:outline-2 focus-visible:outline-rouille"
            >
              <span className={`block ${p.className}`}>{p.sample}</span>
              <span className="block text-sm text-pierre mt-0.5">
                {p.label} · {p.font} {p.pt} pt
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
