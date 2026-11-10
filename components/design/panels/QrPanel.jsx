"use client";

import { useEffect, useState } from "react";
import { CircleNotch } from "@phosphor-icons/react";
import { useEditor } from "../EditorContext";
import { createQrObject, parseQrText, swapObject, qrPlaceholderBox, isQrObject, isQrPlaceholder } from "@/lib/designQr";
import { PanelTitle, ErrorText, WaitingCanvas, useActiveObject } from "./common";

// Côté par défaut : 35 % du plus petit côté de la zone de sécurité, 15 mm minimum.
const defaultSize = (fmt) => Math.max(150, Math.round(Math.min(fmt.safeRect.w, fmt.safeRect.h) * 0.35));

export default function QrPanel() {
  const { canvas, fmt, info, addObject, commit } = useEditor();
  const active = useActiveObject(canvas);
  const selectedQr = isQrObject(active) || isQrPlaceholder(active) ? active : null;
  const [text, setText] = useState(info?.siteUrl || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Un QR sélectionné : son adresse remplit le champ.
  useEffect(() => {
    if (selectedQr?.abpQrText) setText(selectedQr.abpQrText);
  }, [selectedQr]);

  async function submit(e) {
    e.preventDefault();
    if (!canvas || busy) return;
    const parsed = parseQrText(text);
    if (parsed.error) {
      setError(parsed.error);
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (selectedQr && canvas.getObjects().includes(selectedQr)) {
        const box = qrPlaceholderBox(selectedQr);
        // Un QR déjà généré : côté réel = largeur affichée.
        if (isQrObject(selectedQr)) box.size = selectedQr.width * (selectedQr.scaleX ?? 1);
        const qr = await createQrObject(parsed.value, box);
        if (swapObject(canvas, selectedQr, qr)) {
          canvas.setActiveObject(qr);
          canvas.requestRenderAll();
          commit();
        }
      } else {
        const size = defaultSize(fmt);
        addObject(await createQrObject(parsed.value, { cx: 0, cy: 0, size }));
      }
    } catch (err) {
      console.error("QR code :", err?.message);
      setError("Impossible de créer le QR code avec ce texte. Raccourcis-le et réessaie.");
    } finally {
      setBusy(false);
    }
  }

  if (!canvas) return <WaitingCanvas />;

  return (
    <div>
      <PanelTitle hint="Il renvoie vers ton site par défaut. Teste-le avec l'appareil photo de ton téléphone avant d'imprimer.">QR code</PanelTitle>
      <form onSubmit={submit} noValidate>
        <label htmlFor="abp-qr-text" className="label">
          Adresse ou texte
        </label>
        <input
          id="abp-qr-text"
          type="text"
          inputMode="url"
          className="input mt-1"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="https://…"
          aria-invalid={!!error}
          aria-describedby={error ? "abp-qr-error" : undefined}
        />
        {info?.siteUrl && text.trim() !== info.siteUrl && (
          <button type="button" className="mt-1 text-sm text-rouille underline" onClick={() => setText(info.siteUrl)}>
            Revenir à l'adresse du site
          </button>
        )}
        <div id="abp-qr-error">
          <ErrorText>{error}</ErrorText>
        </div>
        <button type="submit" className="btn-primary w-full mt-3" disabled={busy}>
          {busy && <CircleNotch size={20} className="animate-spin" aria-hidden="true" />}
          {busy ? "Création…" : selectedQr ? "Mettre à jour le QR code sélectionné" : "Ajouter le QR code"}
        </button>
      </form>
      <p className="text-sm text-pierre mt-3">Garde-le d'au moins 15 mm de côté, sur un fond clair.</p>
    </div>
  );
}
