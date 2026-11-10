"use client";

import { useEffect, useRef, useState } from "react";
import { Rect, Circle, Line } from "fabric";
import { Square, Circle as CircleIcon, LineSegment } from "@phosphor-icons/react";
import { useEditor } from "../EditorContext";
import { UNITS_PER_MM } from "@/lib/designFormats";
import { PanelTitle, WaitingCanvas, Swatches, useActiveObject, isType, baseSize, RUST } from "./common";

const isShapeRect = (o) => !!o && o.abpRole === "shape" && isType(o, "rect");

export default function ShapesPanel() {
  const { canvas, fmt, addObject, commit } = useEditor();
  const active = useActiveObject(canvas);
  const selectedRect = isShapeRect(active) ? active : null;
  const [color, setColor] = useState(RUST);
  const [radiusMm, setRadiusMm] = useState(2);
  const commitTimer = useRef(null);

  // Le curseur suit l'arrondi du rectangle sélectionné.
  useEffect(() => {
    if (selectedRect) setRadiusMm(Math.round(((selectedRect.rx || 0) * (selectedRect.scaleX ?? 1)) / UNITS_PER_MM * 2) / 2);
  }, [selectedRect]);

  useEffect(() => () => clearTimeout(commitTimer.current), []);

  function changeRadius(mm) {
    setRadiusMm(mm);
    if (!selectedRect || !canvas) return;
    const r = mm * UNITS_PER_MM;
    selectedRect.set({ rx: r / (selectedRect.scaleX || 1), ry: r / (selectedRect.scaleY || 1) });
    canvas.requestRenderAll();
    clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => commit(), 400);
  }

  const s = baseSize(fmt);

  function addRect() {
    const r = radiusMm * UNITS_PER_MM;
    addObject(new Rect({ width: Math.round(s * 1.5), height: Math.round(s), fill: color, rx: r, ry: r, stroke: null, strokeWidth: 0, abpRole: "shape", abpLocked: false }));
  }
  function addCircle() {
    addObject(new Circle({ radius: Math.round(s / 2), fill: color, stroke: null, strokeWidth: 0, abpRole: "shape", abpLocked: false }));
  }
  function addLine() {
    addObject(new Line([0, 0, Math.round(s * 1.5), 0], { stroke: color, strokeWidth: 6, strokeLineCap: "round", fill: null, abpRole: "shape", abpLocked: false }));
  }

  if (!canvas) return <WaitingCanvas />;

  const btn = "flex flex-col items-center gap-1 rounded-lg border border-trait bg-lin hover:bg-sable py-3 text-sm text-encre focus-visible:outline-2 focus-visible:outline-rouille";

  return (
    <div>
      <PanelTitle hint="Choisis la couleur, puis la forme à ajouter.">Formes</PanelTitle>
      <Swatches value={color} onChange={setColor} />

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button type="button" className={btn} onClick={addRect} aria-label="Ajouter un rectangle">
          <Square size={28} weight="fill" color={color} aria-hidden="true" />
          Rectangle
        </button>
        <button type="button" className={btn} onClick={addCircle} aria-label="Ajouter un cercle">
          <CircleIcon size={28} weight="fill" color={color} aria-hidden="true" />
          Cercle
        </button>
        <button type="button" className={btn} onClick={addLine} aria-label="Ajouter une ligne">
          <LineSegment size={28} weight="bold" color={color} aria-hidden="true" />
          Ligne
        </button>
      </div>

      <div className="mt-5">
        <label htmlFor="abp-shape-radius" className="label flex justify-between">
          <span>{selectedRect ? "Coins du rectangle sélectionné" : "Coins arrondis"}</span>
          <span className="tabular-nums">{radiusMm.toLocaleString("fr-FR")} mm</span>
        </label>
        <input
          id="abp-shape-radius"
          type="range"
          min={0}
          max={20}
          step={0.5}
          value={radiusMm}
          onChange={(e) => changeRadius(Number(e.target.value))}
          className="w-full accent-[var(--color-rouille)]"
        />
      </div>
    </div>
  );
}
