"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FabricImage, Rect, util } from "fabric";
import { UploadSimple, CircleNotch } from "@phosphor-icons/react";
import { useEditor } from "../EditorContext";
import { coverCrop, fitScale } from "@/lib/designExport";
import { PanelTitle, ErrorText, WaitingCanvas, useActiveObject, isType, baseSize } from "./common";

// Emplacements de lib/sitePhotos.js (non importé : ce module charge la base de données).
const SITE_SLOTS = ["hero", "services", "confiance", "gallery-1", "gallery-2", "gallery-3", "gallery-4", "gallery-5", "gallery-6"];
const SITE_LABELS = { hero: "Photo principale", services: "Ce que je fais", confiance: "Confiance" };
const slotLabel = (s) => SITE_LABELS[s] || `Galerie ${s.replace("gallery-", "")}`;

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_SIDE = 4000; // au-delà, réduit à TARGET_SIDE (A4 à 300 dpi ≈ 3500 px)
const TARGET_SIDE = 3500;

// Réduit les photos trop lourdes ou trop grandes ; laisse les autres intactes.
async function prepare(file) {
  if (!ALLOWED.includes(file.type)) throw new Error("Format non pris en charge (JPEG, PNG ou WEBP).");
  let bmp;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Cette photo ne peut pas être lue. Essaie en JPEG ou PNG.");
  }
  const side = Math.max(bmp.width, bmp.height);
  if (file.size <= MAX_BYTES && side <= MAX_SIDE) {
    bmp.close?.();
    return file;
  }
  const ratio = Math.min(1, TARGET_SIDE / side);
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * ratio);
  c.height = Math.round(bmp.height * ratio);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.9));
  if (!blob || blob.size > MAX_BYTES) throw new Error("Photo trop lourde (10 Mo au plus).");
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}

const pathOf = (src) => {
  try {
    const u = new URL(src, window.location.origin);
    return u.origin === window.location.origin ? u.pathname + u.search : null;
  } catch {
    return null;
  }
};

// Adresses des photos envoyées déjà utilisées dans la conception.
function assetsIn(pages) {
  const found = new Set();
  const walk = (objs) => {
    for (const o of objs || []) {
      if (!o) continue;
      if (typeof o.src === "string") {
        const p = pathOf(o.src);
        if (p && p.startsWith("/api/designs/assets/")) found.add(p);
      }
      if (Array.isArray(o.objects)) walk(o.objects);
    }
  };
  for (const p of pages || []) walk(p?.objects);
  return [...found];
}

// Emplacement photo (Rect d'un modèle) ou photo déjà cadrée.
const isPhotoFrame = (o) => !!o && o.abpRole === "photo" && isType(o, "rect", "image");

// Cadre visible sur la page (unités) : un Rect, ou le clipPath d'une photo déjà
// cadrée. Même modèle que le cœur de l'éditeur (editor-utils, getPhotoFrame) :
// clipPath Rect relatif à l'image, centré dans son repère local.
function frameOf(o) {
  const sx = o.scaleX ?? 1;
  const sy = o.scaleY ?? 1;
  const clip = isType(o, "image") && o.clipPath && !o.clipPath.absolutePositioned ? o.clipPath : null;
  if (clip) {
    const cw = (clip.width || 0) * (clip.scaleX ?? 1);
    const ch = (clip.height || 0) * (clip.scaleY ?? 1);
    const center = util.transformPoint(clip.getCenterPoint(), o.calcTransformMatrix());
    return { w: cw * sx, h: ch * sy, r: (clip.rx || 0) * (clip.scaleX ?? 1) * sx, center, angle: o.angle || 0 };
  }
  const r = isType(o, "rect") ? (o.rx || 0) * sx : 0;
  return { w: o.width * sx, h: o.height * sy, r, center: o.getCenterPoint(), angle: o.angle || 0 };
}

// Cadre (clipPath) centré dans le repère local de l'image, rayon en unités locales.
function frameClip(width, height, rLocal) {
  return new Rect({ width, height, originX: "center", originY: "center", left: 0, top: 0, rx: rLocal, ry: rLocal, strokeWidth: 0, absolutePositioned: false });
}

function Thumb({ src, label, onPick, onBroken, disabled }) {
  return (
    <button
      type="button"
      onClick={() => onPick(src)}
      disabled={disabled}
      aria-label={`Ajouter la photo ${label}`}
      title={label}
      className="block aspect-square w-full overflow-hidden rounded-lg border border-trait bg-sable hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-rouille"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" onError={onBroken} />
    </button>
  );
}

export default function PhotosPanel() {
  const { canvas, fmt, info, addObject, commit, getPages } = useEditor();
  const active = useActiveObject(canvas);
  const frame = isPhotoFrame(active) ? active : null;
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [uploaded, setUploaded] = useState([]);
  const [broken, setBroken] = useState({});
  const [sessionV] = useState(() => Date.now());

  // Photos du site : versions fournies par la page (info.sitePhotos = { slot: v }) si présentes,
  // sinon on tente chaque emplacement et on masque ceux qui ne chargent pas.
  const sitePhotos = useMemo(() => {
    const known = info?.sitePhotos && typeof info.sitePhotos === "object" ? info.sitePhotos : null;
    const slots = known ? SITE_SLOTS.filter((s) => known[s]) : SITE_SLOTS;
    return slots.map((slot) => ({ slot, src: `/api/site-photos/${slot}?v=${known ? known[slot] : sessionV}` }));
  }, [info, sessionV]);
  const visibleSite = sitePhotos.filter((p) => !broken[p.src]);

  useEffect(() => {
    if (!canvas) return;
    try {
      const found = assetsIn(getPages());
      if (found.length) setUploaded((u) => [...new Set([...u, ...found])]);
    } catch {
      /* la liste reste vide */
    }
    // Une seule fois à l'ouverture de l'éditeur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas]);

  async function place(src) {
    if (!canvas || placing) return;
    setError("");
    setPlacing(true);
    try {
      let img;
      try {
        img = await FabricImage.fromURL(src);
      } catch {
        throw new Error("Cette photo n'a pas pu être chargée. Réessaie.");
      }
      const iw = img.width;
      const ih = img.height;
      const target = canvas.getActiveObject?.();
      if (isPhotoFrame(target) && canvas.getObjects().includes(target)) {
        // La photo prend la place et la taille de l'emplacement, en couverture :
        // image entière à l'échelle c.scale, cadre (clipPath) de c.width × c.height
        // au centre (zoom 1, décalage 0 pour la barre d'outils).
        const f = frameOf(target);
        const c = coverCrop(iw, ih, f.w, f.h);
        img.set({
          scaleX: c.scale,
          scaleY: c.scale,
          angle: f.angle,
          opacity: target.opacity ?? 1,
          abpRole: "photo",
          abpLocked: false,
        });
        img.clipPath = frameClip(c.width, c.height, f.r / c.scale);
        img.setPositionByOrigin(f.center, "center", "center");
        img.setCoords();
        const idx = canvas.getObjects().indexOf(target);
        canvas.discardActiveObject();
        canvas.remove(target);
        canvas.insertAt(idx, img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
        commit();
      } else {
        const s = fitScale(iw, ih, baseSize(fmt) * 1.5);
        img.set({ scaleX: s, scaleY: s, abpRole: "photo", abpLocked: false });
        img.clipPath = frameClip(iw, ih, 0);
        addObject(img);
      }
    } catch (e) {
      setError(e?.message || "Impossible d'ajouter la photo.");
    } finally {
      setPlacing(false);
    }
  }

  async function onFiles(files) {
    const list = [...(files || [])];
    if (!list.length) return;
    setError("");
    setUploading(true);
    let last = null;
    try {
      for (const file of list) {
        const ready = await prepare(file);
        const form = new FormData();
        form.append("file", ready);
        let res;
        try {
          res = await fetch("/api/designs/assets", { method: "POST", body: form });
        } catch {
          throw new Error("Envoi impossible : vérifie ta connexion.");
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.asset?.src) throw new Error(data?.error || "Échec de l'envoi de la photo.");
        last = data.asset.src;
        setUploaded((u) => [data.asset.src, ...u.filter((x) => x !== data.asset.src)]);
      }
    } catch (e) {
      setError(e?.message || "Échec de l'envoi de la photo.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
    // Une seule photo envoyée : on la pose directement.
    if (last && list.length === 1) await place(last);
  }

  if (!canvas) return <WaitingCanvas />;

  return (
    <div>
      <PanelTitle
        hint={
          frame
            ? "L'emplacement sélectionné sera rempli par la photo choisie."
            : "Sélectionne un emplacement photo sur la toile pour le remplir, ou ajoute la photo librement."
        }
      >
        Photos
      </PanelTitle>

      <label className={`btn-primary w-full cursor-pointer ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
        {uploading ? <CircleNotch size={20} className="animate-spin" aria-hidden="true" /> : <UploadSimple size={20} aria-hidden="true" />}
        {uploading ? "Envoi en cours…" : "Envoyer une photo"}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          disabled={uploading}
          onChange={(e) => onFiles(e.target.files)}
        />
      </label>
      <p className="text-sm text-pierre mt-1.5">JPEG, PNG ou WEBP, 10 Mo au plus.</p>
      <ErrorText>{error}</ErrorText>
      {placing && (
        <p className="text-sm text-pierre mt-2 flex items-center gap-1.5" aria-live="polite">
          <CircleNotch size={16} className="animate-spin" aria-hidden="true" /> Ajout de la photo…
        </p>
      )}

      {uploaded.length > 0 && (
        <section className="mt-5">
          <h3 className="label mb-2">Tes photos</h3>
          <div className="grid grid-cols-3 gap-2">
            {uploaded
              .filter((src) => !broken[src])
              .map((src, i) => (
                <Thumb
                  key={src}
                  src={src}
                  label={`envoyée ${i + 1}`}
                  onPick={place}
                  disabled={placing}
                  onBroken={() => setBroken((b) => ({ ...b, [src]: true }))}
                />
              ))}
          </div>
        </section>
      )}

      <section className="mt-5">
        <h3 className="label mb-2">Photos du site</h3>
        {visibleSite.length === 0 ? (
          <p className="text-sm text-pierre">Aucune photo du site pour l'instant.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {visibleSite.map((p) => (
              <Thumb
                key={p.slot}
                src={p.src}
                label={slotLabel(p.slot)}
                onPick={place}
                disabled={placing}
                onBroken={() => setBroken((b) => ({ ...b, [p.src]: true }))}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
