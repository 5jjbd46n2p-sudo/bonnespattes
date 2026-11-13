"use client";

import { useEffect, useRef } from "react";
import { Line } from "fabric";
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowLineDown,
  ArrowLineUp,
  Copy,
  Lock,
  LockOpen,
  TextAlignCenter,
  TextAlignJustify,
  TextAlignLeft,
  TextAlignRight,
  TextB,
  TextItalic,
  Trash,
} from "@phosphor-icons/react";
import { FONTS } from "@/lib/designFonts";
import { useEditor } from "./EditorContext";
import { ColorField, NumberField, RangeField } from "./editor-fields";
import {
  UNITS_PER_PT,
  getMainColor,
  getPhotoCrop,
  isGroup,
  isImage,
  isRect,
  isSelection,
  isText,
  setGroupColor,
  setPhotoCrop,
} from "./editor-utils";

const round = (n, step = 0.1) => Math.round(n / step) * step;
const fmtNum = (n, digits = 1) => String(Number(n.toFixed(digits)));

function IconButton({ label, onClick, active = false, disabled = false, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "border-rouille bg-sable text-rouille" : "border-transparent text-encre hover:bg-sable"
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-6 w-px shrink-0 bg-trait" aria-hidden="true" />;

// Barre contextuelle de l'éditeur : réglages de l'élément sélectionné.
// `active` = canvas.getActiveObject() ; `tick` force le rafraîchissement.
export default function Toolbar({ active, refresh, resolver, actions }) {
  const { canvas, commit } = useEditor();
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (!canvas) return null;

  const commitSoon = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(), 350);
  };

  // Applique fn, redessine, rafraîchit la barre et enregistre.
  const change = (fn, soon = false) => {
    fn();
    canvas.requestRenderAll();
    refresh();
    if (soon) commitSoon();
    else commit();
  };

  const targets = canvas.getActiveObjects();
  const single = active && !isSelection(active) ? active : null;
  const allLocked = targets.length > 0 && targets.every((o) => o.abpLocked);

  const history = (
    <>
      <IconButton label="Annuler (Ctrl+Z)" onClick={actions.undo} disabled={!actions.canUndo}>
        <ArrowCounterClockwise size={20} />
      </IconButton>
      <IconButton label="Rétablir (Ctrl+Maj+Z)" onClick={actions.redo} disabled={!actions.canRedo}>
        <ArrowClockwise size={20} />
      </IconButton>
      <Sep />
    </>
  );

  if (!active) {
    return (
      <div className="flex min-h-[52px] flex-wrap items-center gap-2 border-b border-trait bg-lin px-3 py-2">
        {history}
        <ColorField
          label="Fond de la page"
          value={canvas.backgroundColor}
          onChange={(c) =>
            change(() => {
              canvas.backgroundColor = c || "#ffffff";
            })
          }
        />
        <span className="text-sm text-pierre">Sélectionne un élément pour le modifier.</span>
      </div>
    );
  }

  // --- Réglages propres au type d'élément -----------------------------------
  let specific = null;
  const role = single?.abpRole;

  if (single && isText(single)) {
    const t = single;
    const fontKey = resolver ? resolver.toStored(t.fontFamily) : t.fontFamily;
    const bold = Number(t.fontWeight) >= 600 || t.fontWeight === "bold";
    const setText = (props, soon) =>
      change(() => {
        t.set(props);
        if (typeof t.initDimensions === "function") t.initDimensions();
        t.setCoords();
      }, soon);
    specific = (
      <>
        <label className="flex items-center">
          <span className="sr-only">Police</span>
          <select
            className="h-9 rounded-lg border border-trait bg-lin px-2 text-sm text-encre"
            value={fontKey}
            aria-label="Police"
            onChange={(e) =>
              setText({ fontFamily: resolver ? resolver.toRuntime(e.target.value) : e.target.value })
            }
          >
            {FONTS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.key}
              </option>
            ))}
            {!FONTS.some((f) => f.key === fontKey) && <option value={fontKey}>{fontKey}</option>}
          </select>
        </label>
        <NumberField
          label="Taille (pt)"
          value={fmtNum(round((t.fontSize || 0) / UNITS_PER_PT, 0.5))}
          min={4}
          max={200}
          step={0.5}
          suffix="pt"
          onChange={(pt) => setText({ fontSize: pt * UNITS_PER_PT }, true)}
        />
        <IconButton label="Gras" active={bold} onClick={() => setText({ fontWeight: bold ? 400 : 700 })}>
          <TextB size={20} />
        </IconButton>
        <IconButton
          label="Italique"
          active={t.fontStyle === "italic"}
          onClick={() => setText({ fontStyle: t.fontStyle === "italic" ? "normal" : "italic" })}
        >
          <TextItalic size={20} />
        </IconButton>
        <Sep />
        {[
          ["left", "Aligner à gauche", TextAlignLeft],
          ["center", "Centrer", TextAlignCenter],
          ["right", "Aligner à droite", TextAlignRight],
          ["justify", "Justifier", TextAlignJustify],
        ].map(([value, label, Icon]) => (
          <IconButton
            key={value}
            label={label}
            active={(t.textAlign || "left") === value}
            onClick={() => setText({ textAlign: value })}
          >
            <Icon size={20} />
          </IconButton>
        ))}
        <Sep />
        <NumberField
          label="Interligne"
          value={fmtNum(t.lineHeight || 1.16, 2)}
          min={0.6}
          max={3}
          step={0.05}
          suffix="ligne"
          onChange={(v) => setText({ lineHeight: v }, true)}
        />
        <NumberField
          label="Espacement des lettres"
          value={fmtNum(t.charSpacing || 0, 0)}
          min={-100}
          max={800}
          step={10}
          suffix="esp."
          onChange={(v) => setText({ charSpacing: v }, true)}
        />
        <ColorField label="Couleur du texte" value={t.fill} onChange={(c) => change(() => t.set("fill", c || "#1f1a15"))} />
        <ColorField
          label="Contour du texte"
          allowNone
          value={t.strokeWidth > 0 ? t.stroke : null}
          onChange={(c) =>
            setText(c ? { stroke: c, strokeWidth: t.strokeWidth > 0 ? t.strokeWidth : 2 } : { stroke: null, strokeWidth: 0 })
          }
        />
        <NumberField
          label="Épaisseur du contour du texte (mm)"
          value={fmtNum((t.strokeWidth || 0) / 10, 2)}
          min={0}
          max={5}
          step={0.05}
          suffix="mm"
          onChange={(mm) => setText(mm > 0 && !t.stroke ? { strokeWidth: mm * 10, stroke: "#1f1a15" } : { strokeWidth: mm * 10 }, true)}
        />
      </>
    );
  } else if (single && isImage(single)) {
    const img = single;
    const crop = getPhotoCrop(img);
    const setCrop = (patch) => change(() => setPhotoCrop(img, { ...crop, ...patch }), true);
    specific = (
      <>
        <RangeField
          label="Zoom"
          min={1}
          max={4}
          step={0.05}
          value={crop.zoom}
          display={`${Math.round(crop.zoom * 100)} %`}
          onChange={(v) => setCrop({ zoom: v })}
        />
        <RangeField
          label="Horizontal"
          min={-1}
          max={1}
          step={0.02}
          value={crop.panX}
          onChange={(v) => setCrop({ panX: v })}
        />
        <RangeField
          label="Vertical"
          min={-1}
          max={1}
          step={0.02}
          value={crop.panY}
          onChange={(v) => setCrop({ panY: v })}
        />
        <NumberField
          label="Coins arrondis (mm)"
          value={fmtNum(crop.radius / 10)}
          min={0}
          max={100}
          step={0.5}
          suffix="mm"
          onChange={(mm) => setCrop({ radius: mm * 10 })}
        />
      </>
    );
  } else if (single && role === "qr") {
    specific = <span className="text-sm text-pierre">QR code : garde-le foncé sur fond clair pour qu&apos;il se lise bien.</span>;
  } else if (single && (isGroup(single) || role === "icon")) {
    specific = (
      <ColorField
        label="Couleur"
        value={getMainColor(single)}
        onChange={(c) =>
          change(() => {
            if (isGroup(single)) setGroupColor(single, c || "#1f1a15");
            else single.set(single.fill && single.fill !== "transparent" ? "fill" : "stroke", c || "#1f1a15");
          })
        }
      />
    );
  } else if (single) {
    const isLine = single instanceof Line;
    const strokeMm = (single.strokeWidth || 0) / 10;
    specific = (
      <>
        {!isLine && (
          <ColorField
            label="Remplissage"
            allowNone
            value={single.fill}
            onChange={(c) => change(() => single.set("fill", c || "transparent"))}
          />
        )}
        <ColorField
          label="Contour"
          allowNone={!isLine}
          value={single.strokeWidth > 0 ? single.stroke : null}
          onChange={(c) =>
            change(() => {
              if (!c) single.set({ stroke: null, strokeWidth: 0 });
              else single.set({ stroke: c, strokeWidth: single.strokeWidth > 0 ? single.strokeWidth : 5 });
            })
          }
        />
        <NumberField
          label="Épaisseur du contour (mm)"
          value={fmtNum(strokeMm)}
          min={0}
          max={20}
          step={0.1}
          suffix="mm"
          onChange={(mm) =>
            change(() => {
              single.set({ strokeWidth: mm * 10 });
              if (mm > 0 && !single.stroke) single.set("stroke", "#1f1a15");
              single.setCoords();
            }, true)
          }
        />
        {isRect(single) && (
          <NumberField
            label="Coins arrondis (mm)"
            value={fmtNum(((single.rx || 0) * (single.scaleX || 1)) / 10)}
            min={0}
            max={100}
            step={0.5}
            suffix="mm"
            onChange={(mm) =>
              change(() => single.set({ rx: (mm * 10) / (single.scaleX || 1), ry: (mm * 10) / (single.scaleY || 1) }), true)
            }
          />
        )}
        {role === "photo" && (
          <span className="text-sm text-pierre">Emplacement photo : choisis une photo dans le panneau Photos.</span>
        )}
      </>
    );
  } else {
    specific = <span className="text-sm text-pierre">{targets.length} éléments sélectionnés</span>;
  }

  const opacity = Math.round((single ? single.opacity ?? 1 : targets[0]?.opacity ?? 1) * 100);

  return (
    <div className="flex min-h-[52px] flex-wrap items-center gap-2 border-b border-trait bg-lin px-3 py-2">
      {history}
      {specific}
      <Sep />
      <RangeField
        label="Opacité"
        min={10}
        max={100}
        step={5}
        value={opacity}
        display={`${opacity} %`}
        onChange={(v) => change(() => targets.forEach((o) => o.set("opacity", v / 100)), true)}
      />
      <Sep />
      <IconButton label="Premier plan" onClick={actions.bringFront}>
        <ArrowLineUp size={20} />
      </IconButton>
      <IconButton label="Arrière-plan" onClick={actions.sendBack}>
        <ArrowLineDown size={20} />
      </IconButton>
      <IconButton label={allLocked ? "Déverrouiller" : "Verrouiller"} active={allLocked} onClick={actions.toggleLock}>
        {allLocked ? <Lock size={20} /> : <LockOpen size={20} />}
      </IconButton>
      <IconButton label="Dupliquer (Ctrl+D)" onClick={actions.duplicate}>
        <Copy size={20} />
      </IconButton>
      <IconButton label="Supprimer (Suppr)" onClick={actions.remove} disabled={allLocked}>
        <Trash size={20} />
      </IconButton>
    </div>
  );
}
