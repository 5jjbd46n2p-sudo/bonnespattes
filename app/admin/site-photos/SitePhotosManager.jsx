"use client";

import { useState } from "react";
import { Camera, Trash } from "@phosphor-icons/react";

// Réduit la photo (les photos de téléphone dépassent la limite d'envoi) : 1600 px, JPEG.
async function shrink(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const ratio = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * ratio);
  canvas.height = Math.round(bmp.height * ratio);
  canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.85));
  if (!blob) throw new Error("conversion");
  return blob;
}

export default function SitePhotosManager({ slots, initial }) {
  const [versions, setVersions] = useState(initial || {});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function onPick(slot, e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setBusy(slot);
    try {
      const blob = await shrink(file);
      const fd = new FormData();
      fd.append("file", blob, `${slot}.jpg`);
      const res = await fetch(`/api/site-photos/${slot}`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Envoi impossible.");
      setVersions((v) => ({ ...v, [slot]: data.v }));
    } catch (err) {
      setError(
        err.message === "conversion" || err.name === "InvalidStateError"
          ? "Cette photo n'a pas pu être lue. Essaie une photo au format JPEG ou PNG."
          : err.message || "Envoi impossible."
      );
    }
    setBusy("");
  }

  async function remove(slot) {
    if (!confirm("Retirer cette photo de la page d'accueil ?")) return;
    setError("");
    setBusy(slot);
    const res = await fetch(`/api/site-photos/${slot}`, { method: "DELETE" });
    if (res.ok) {
      setVersions((v) => {
        const n = { ...v };
        delete n[slot];
        return n;
      });
    } else setError("Suppression impossible.");
    setBusy("");
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-sm font-bold text-brique">
          {error}
        </p>
      )}
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {slots.map((s) => {
          const v = versions[s.slot];
          return (
            <li key={s.slot} className="card p-3 space-y-2">
              <p className="label">{s.label}</p>
              <div className="relative aspect-[4/3] bg-sable rounded-lg overflow-hidden flex items-center justify-center text-pierre text-sm">
                {v ? (
                  <img src={`/api/site-photos/${s.slot}?v=${v}`} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  "Pas encore de photo"
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className={`btn-ghost text-sm gap-2 !py-1.5 !px-3 cursor-pointer ${busy === s.slot ? "opacity-60 pointer-events-none" : ""}`}>
                  <Camera size={20} aria-hidden="true" />
                  {busy === s.slot ? "Envoi..." : v ? "Changer" : "Choisir dans la galerie"}
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => onPick(s.slot, e)} disabled={busy === s.slot} />
                </label>
                {v && (
                  <button type="button" onClick={() => remove(s.slot)} disabled={busy === s.slot} className="text-sm text-brique underline inline-flex items-center gap-1 min-h-[44px]">
                    <Trash size={18} aria-hidden="true" />
                    Retirer
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
