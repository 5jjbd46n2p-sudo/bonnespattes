"use client";

import { useEffect, useId, useRef, useState } from "react";
import { DownloadSimple, FilePdf, FileImage, CircleNotch, CaretDown, CheckCircle } from "@phosphor-icons/react";
import { useEditor } from "./EditorContext";
import { FACE_LABELS } from "@/lib/designFormats";
import { exportPdf, exportPng, ExportError } from "@/lib/designExport";
import { attachQrSync } from "@/lib/designQr";

export default function ExportMenu() {
  const { canvas, fmt, design, faceIndex, getPages } = useEditor();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(""); // texte de progression
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const rootRef = useRef(null);
  const firstItemRef = useRef(null);
  const menuId = useId();

  // L'éditeur peut masquer le panneau gauche (petit écran) : on garde la
  // substitution des QR ici aussi (un seul écouteur par toile).
  useEffect(() => attachQrSync(canvas), [canvas]);

  useEffect(() => {
    if (!open) return undefined;
    firstItemRef.current?.focus();
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
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

  useEffect(() => {
    if (!done) return undefined;
    const t = setTimeout(() => setDone(""), 6000);
    return () => clearTimeout(t);
  }, [done]);

  // Faces au format stocké, sans sélection multiple en cours (coordonnées relatives).
  function currentPages() {
    const active = canvas?.getActiveObject?.();
    if (active && String(active.type).toLowerCase() === "activeselection") {
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    }
    return getPages();
  }

  async function run(kind) {
    if (busy || !fmt) return;
    setOpen(false);
    setError("");
    setDone("");
    try {
      const pages = currentPages();
      const name = design?.name || "conception";
      let filename;
      if (kind === "pdf") {
        setBusy("Préparation du PDF…");
        filename = await exportPdf(pages, fmt, name, {
          onProgress: (i, total) => setBusy(total > 1 ? `PDF : face ${i + 1} sur ${total}…` : "Préparation du PDF…"),
        });
      } else {
        setBusy("Préparation de l'image…");
        const face = fmt.faces > 1 ? `-${(FACE_LABELS[faceIndex] || "").toLowerCase()}` : "";
        filename = await exportPng(pages[faceIndex] ?? pages[0], fmt, `${name}${face}`);
      }
      setDone(`${filename} téléchargé.`);
    } catch (e) {
      console.error("Export :", e?.message);
      setError(e instanceof ExportError ? e.message : "L'export a échoué. Réessaie dans un instant.");
    } finally {
      setBusy("");
    }
  }

  const item =
    "flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left hover:bg-sable focus-visible:bg-sable focus-visible:outline-none";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="btn-primary"
        onClick={() => setOpen((o) => !o)}
        disabled={!!busy || !fmt}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        {busy ? <CircleNotch size={20} className="animate-spin" aria-hidden="true" /> : <DownloadSimple size={20} aria-hidden="true" />}
        <span>{busy ? "Export…" : "Télécharger"}</span>
        {!busy && <CaretDown size={16} aria-hidden="true" />}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Formats de téléchargement"
          className="card absolute right-0 z-40 mt-2 w-72 p-1.5"
          style={{ boxShadow: "var(--shadow-modal)" }}
        >
          <button ref={firstItemRef} type="button" role="menuitem" className={item} onClick={() => run("pdf")}>
            <FilePdf size={24} className="text-rouille shrink-0" aria-hidden="true" />
            <span>
              <span className="block font-bold text-encre">PDF pour Vistaprint</span>
              <span className="block text-sm text-pierre">
                {fmt ? `${fmt.faces > 1 ? "Recto et verso" : "Une page"}, ${fmt.bleedMm.w.toLocaleString("fr-FR")} × ${fmt.bleedMm.h.toLocaleString("fr-FR")} mm avec fond perdu, 300 dpi` : ""}
              </span>
            </span>
          </button>
          <button type="button" role="menuitem" className={item} onClick={() => run("png")}>
            <FileImage size={24} className="text-rouille shrink-0" aria-hidden="true" />
            <span>
              <span className="block font-bold text-encre">PNG (réseaux sociaux)</span>
              <span className="block text-sm text-pierre">
                {fmt?.faces > 1 ? `${FACE_LABELS[faceIndex] || "Face"} seulement, ` : ""}rogné à la taille finie
              </span>
            </span>
          </button>
        </div>
      )}

      <div aria-live="polite" className="absolute right-0 top-full z-30 mt-2 w-72">
        {busy && !open && <p className="card px-3 py-2 text-sm text-pierre">{busy}</p>}
        {done && !busy && !open && (
          <p className="card flex items-center gap-2 px-3 py-2 text-sm text-mousse">
            <CheckCircle size={18} aria-hidden="true" /> {done}
          </p>
        )}
      </div>
      {error && !open && (
        <div role="alert" className="card absolute right-0 top-full z-30 mt-2 w-72 px-3 py-2 text-sm text-brique">
          <p>{error}</p>
          <button type="button" className="mt-1 text-encre underline" onClick={() => setError("")}>
            Fermer
          </button>
        </div>
      )}
    </div>
  );
}
