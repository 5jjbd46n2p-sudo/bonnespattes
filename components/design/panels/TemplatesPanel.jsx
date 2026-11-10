"use client";

import { useEffect, useMemo, useState } from "react";
import { useEditor } from "../EditorContext";
import { templatesFor, blankPages } from "@/lib/designTemplates";
import { FACE_LABELS } from "@/lib/designFormats";
import { renderFace } from "@/lib/designExport";
import ConfirmDialog from "./ConfirmDialog";
import { PanelTitle, ErrorText, WaitingCanvas } from "./common";

const THUMB_W = 220;

function pageOf(pages, faceIndex) {
  return pages?.[faceIndex] ?? pages?.[0] ?? null;
}

// Vignettes rendues une à une (même moteur que l'export), sans bloquer le panneau.
function useThumbnails(items, fmt) {
  const [thumbs, setThumbs] = useState({});
  useEffect(() => {
    if (!fmt || !items.length) return undefined;
    let cancelled = false;
    const urls = [];
    (async () => {
      for (const it of items) {
        if (cancelled) return;
        try {
          const blob = await renderFace(it.page, fmt, { multiplier: THUMB_W / fmt.canvas.w, format: "jpeg", quality: 0.8 });
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          urls.push(url);
          setThumbs((t) => ({ ...t, [it.id]: url }));
        } catch {
          if (!cancelled) setThumbs((t) => ({ ...t, [it.id]: null }));
        }
      }
    })();
    return () => {
      cancelled = true;
      for (const u of urls) URL.revokeObjectURL(u);
      setThumbs({});
    };
  }, [items, fmt]);
  return thumbs;
}

export default function TemplatesPanel() {
  const { canvas, fmt, design, info, faceIndex, replaceCurrentPage } = useEditor();
  const [pending, setPending] = useState(null); // { id, label, page }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const all = useMemo(() => templatesFor(design.format), [design.format]);
  // Clé stable : les vignettes ne sont recalculées que si les infos changent vraiment.
  const infoKey = JSON.stringify(info ?? {});
  const items = useMemo(() => {
    const data = JSON.parse(infoKey);
    const out = [];
    for (const t of all) {
      if (t.orientation && t.orientation !== design.orientation) continue;
      try {
        const page = pageOf(t.build(data), faceIndex);
        if (page) out.push({ id: t.id, label: t.label, description: t.description, page });
      } catch (e) {
        console.error("Modèle", t.id, e?.message);
      }
    }
    return out;
  }, [all, design.orientation, infoKey, faceIndex]);
  const hidden = all.length - items.length;
  const thumbs = useThumbnails(items, fmt);
  const faceLabel = fmt?.faces > 1 ? (FACE_LABELS[faceIndex] || "").toLowerCase() : "";

  function askBlank() {
    setError("");
    setPending({ id: "blank", label: "Page vierge", page: pageOf(blankPages(design.format), faceIndex) });
  }

  async function applyPending() {
    if (!pending?.page) return;
    setBusy(true);
    setError("");
    try {
      await replaceCurrentPage(structuredClone(pending.page));
      setPending(null);
    } catch (e) {
      console.error("Remplacement de la page :", e?.message);
      setError("Impossible d'appliquer ce modèle. Réessaie.");
    } finally {
      setBusy(false);
    }
  }

  if (!canvas) return <WaitingCanvas />;

  return (
    <div>
      <PanelTitle hint={faceLabel ? `Remplace le ${faceLabel} par celui du modèle.` : "Remplace la page par celle du modèle."}>Modèles</PanelTitle>

      <ul className="grid gap-3">
        {items.map((it) => (
          <li key={it.id}>
            <button
              type="button"
              onClick={() => {
                setError("");
                setPending(it);
              }}
              className="w-full text-left rounded-lg border border-trait bg-lin hover:bg-sable p-2 focus-visible:outline-2 focus-visible:outline-rouille"
            >
              <span
                className="block w-full rounded bg-sable overflow-hidden"
                style={{ aspectRatio: fmt ? `${fmt.canvas.w} / ${fmt.canvas.h}` : undefined }}
              >
                {thumbs[it.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbs[it.id]} alt="" className="block h-full w-full object-cover" />
                ) : thumbs[it.id] === undefined ? (
                  <span className="flex h-full items-center justify-center text-xs text-pierre">Aperçu…</span>
                ) : null}
              </span>
              <span className="mt-2 block font-bold text-encre">{it.label}</span>
              <span className="block text-sm text-pierre">{it.description}</span>
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={askBlank}
            className="w-full rounded-lg border border-dashed border-trait bg-papier hover:bg-sable p-3 text-left focus-visible:outline-2 focus-visible:outline-rouille"
          >
            <span className="block font-bold text-encre">Page vierge</span>
            <span className="block text-sm text-pierre">Fond papier, rien d'autre.</span>
          </button>
        </li>
      </ul>

      {items.length === 0 && <p className="text-sm text-pierre mt-3">Aucun modèle pour ce format et cette orientation.</p>}
      {hidden > 0 && items.length > 0 && <p className="text-sm text-pierre mt-3">Les modèles d'une autre orientation sont masqués.</p>}
      <ErrorText>{!pending && error}</ErrorText>

      <ConfirmDialog
        open={!!pending}
        title={pending?.id === "blank" ? "Repartir d'une page vierge ?" : `Appliquer le modèle « ${pending?.label} » ?`}
        confirmLabel="Remplacer"
        busy={busy}
        error={error}
        onCancel={() => {
          if (!busy) setPending(null);
        }}
        onConfirm={applyPending}
      >
        {faceLabel ? `Le contenu actuel du ${faceLabel} sera remplacé.` : "Le contenu actuel de la page sera remplacé."} Tu pourras annuler avec Ctrl+Z.
      </ConfirmDialog>
    </div>
  );
}
