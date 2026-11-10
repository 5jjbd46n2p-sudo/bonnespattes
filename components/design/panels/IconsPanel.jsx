"use client";

import { createElement, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadSVGFromString, util, Group } from "fabric";
import {
  PawPrint,
  Dog,
  Cat,
  House,
  Phone,
  EnvelopeSimple,
  MapPin,
  InstagramLogo,
  WhatsappLogo,
  Heart,
  Star,
  Camera,
} from "@phosphor-icons/react";
import { useEditor } from "../EditorContext";
import { PanelTitle, ErrorText, WaitingCanvas, Swatches, baseSize, RUST } from "./common";

const ICONS = [
  { id: "patte", label: "Patte", Icon: PawPrint },
  { id: "chien", label: "Chien", Icon: Dog },
  { id: "chat", label: "Chat", Icon: Cat },
  { id: "maison", label: "Maison", Icon: House },
  { id: "telephone", label: "Téléphone", Icon: Phone },
  { id: "email", label: "E-mail", Icon: EnvelopeSimple },
  { id: "localisation", label: "Localisation", Icon: MapPin },
  { id: "instagram", label: "Instagram", Icon: InstagramLogo },
  { id: "whatsapp", label: "WhatsApp", Icon: WhatsappLogo },
  { id: "coeur", label: "Cœur", Icon: Heart },
  { id: "etoile", label: "Étoile", Icon: Star },
  { id: "photo", label: "Appareil photo", Icon: Camera },
];

const WEIGHTS = [
  { id: "regular", label: "Contour" },
  { id: "fill", label: "Plein" },
];

// SVG Phosphor (256 × 256) → groupe Fabric de côté `size` unités.
async function iconObject(Icon, weight, color, size) {
  const markup = renderToStaticMarkup(createElement(Icon, { size: 256, weight, color }));
  const { objects, options } = await loadSVGFromString(markup);
  const parts = (objects || []).filter(Boolean);
  if (!parts.length) throw new Error("icône vide");
  let obj = util.groupSVGElements(parts, options);
  if (String(obj.type).toLowerCase() !== "group") obj = new Group([obj]);
  const base = Math.max(obj.width || 0, obj.height || 0) || 256;
  obj.set({ scaleX: size / base, scaleY: size / base, abpRole: "icon", abpLocked: false });
  return obj;
}

export default function IconsPanel() {
  const { canvas, fmt, addObject } = useEditor();
  const [weight, setWeight] = useState("regular");
  const [color, setColor] = useState(RUST);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  async function add(item) {
    if (busy) return;
    setBusy(item.id);
    setError("");
    try {
      addObject(await iconObject(item.Icon, weight, color, Math.round(baseSize(fmt) * 0.5)));
    } catch (e) {
      console.error("Icône :", e?.message);
      setError("Impossible d'ajouter cette icône. Réessaie.");
    } finally {
      setBusy(null);
    }
  }

  if (!canvas) return <WaitingCanvas />;

  return (
    <div>
      <PanelTitle hint="Garde-les dans la zone de sécurité pour qu'elles ne soient pas coupées.">Icônes</PanelTitle>

      <div role="radiogroup" aria-label="Style des icônes" className="inline-flex rounded-lg border border-trait p-0.5 mb-3">
        {WEIGHTS.map((w) => (
          <button
            key={w.id}
            type="button"
            role="radio"
            aria-checked={weight === w.id}
            onClick={() => setWeight(w.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-bold ${weight === w.id ? "bg-rouille text-sur-rouille" : "text-pierre hover:bg-sable"}`}
          >
            {w.label}
          </button>
        ))}
      </div>

      <Swatches value={color} onChange={setColor} />

      <ul className="mt-4 grid grid-cols-4 gap-2">
        {ICONS.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => add(item)}
              disabled={!!busy}
              aria-label={`Ajouter l'icône ${item.label}`}
              title={item.label}
              className="flex aspect-square w-full items-center justify-center rounded-lg border border-trait bg-lin hover:bg-sable disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-rouille"
            >
              <item.Icon size={28} weight={weight} color={color} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
