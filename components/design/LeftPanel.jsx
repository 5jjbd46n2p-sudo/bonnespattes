"use client";

import { useEffect, useId, useRef, useState } from "react";
import { SquaresFour, TextT, Image as ImageIcon, Shapes, Sticker, QrCode } from "@phosphor-icons/react";
import { useEditor } from "./EditorContext";
import { attachQrSync } from "@/lib/designQr";
import TemplatesPanel from "./panels/TemplatesPanel";
import TextPanel from "./panels/TextPanel";
import PhotosPanel from "./panels/PhotosPanel";
import ShapesPanel from "./panels/ShapesPanel";
import IconsPanel from "./panels/IconsPanel";
import QrPanel from "./panels/QrPanel";

const TABS = [
  { id: "modeles", label: "Modèles", Icon: SquaresFour, Panel: TemplatesPanel },
  { id: "textes", label: "Textes", Icon: TextT, Panel: TextPanel },
  { id: "photos", label: "Photos", Icon: ImageIcon, Panel: PhotosPanel },
  { id: "formes", label: "Formes", Icon: Shapes, Panel: ShapesPanel },
  { id: "icones", label: "Icônes", Icon: Sticker, Panel: IconsPanel },
  { id: "qr", label: "QR code", Icon: QrCode, Panel: QrPanel },
];

export default function LeftPanel() {
  const { canvas } = useEditor();
  const [tab, setTab] = useState("modeles");
  const tabRefs = useRef({});
  const baseId = useId();

  // Vrais QR codes à la place des emplacements des modèles, à chaque face chargée.
  useEffect(() => attachQrSync(canvas), [canvas]);

  const current = TABS.find((t) => t.id === tab) || TABS[0];
  const Panel = current.Panel;

  // Flèches haut/bas entre les onglets (motif « tablist » vertical).
  function onKeyDown(e) {
    const i = TABS.findIndex((t) => t.id === tab);
    let next = null;
    if (e.key === "ArrowDown") next = TABS[(i + 1) % TABS.length];
    else if (e.key === "ArrowUp") next = TABS[(i - 1 + TABS.length) % TABS.length];
    else if (e.key === "Home") next = TABS[0];
    else if (e.key === "End") next = TABS[TABS.length - 1];
    if (!next) return;
    e.preventDefault();
    setTab(next.id);
    tabRefs.current[next.id]?.focus();
  }

  return (
    <aside className="flex h-full min-h-0 border-r border-trait bg-lin" aria-label="Éléments à ajouter">
      <div role="tablist" aria-orientation="vertical" aria-label="Panneaux" className="flex w-20 shrink-0 flex-col gap-1 border-r border-trait bg-papier p-1.5" onKeyDown={onKeyDown}>
        {TABS.map((t) => {
          const selected = t.id === tab;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              aria-label={t.label}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-xs font-bold focus-visible:outline-2 focus-visible:outline-rouille ${
                selected ? "bg-sable text-rouille" : "text-pierre hover:bg-sable hover:text-encre"
              }`}
            >
              <t.Icon size={24} weight={selected ? "fill" : "regular"} aria-hidden="true" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${current.id}`}
        className="w-72 min-h-0 overflow-y-auto p-4"
      >
        <Panel />
      </div>
    </aside>
  );
}
