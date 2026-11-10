// Export des conceptions (navigateur uniquement pour le rendu) :
// - PDF pour Vistaprint : une page par face à la taille avec fond perdu, image
//   JPEG 300 dpi pleine page (pdf-lib) ;
// - PNG (réseaux sociaux) : face courante rognée à la coupe.
// Le rendu passe par un StaticCanvas hors écran, sans les repères de l'éditeur.
//
// `fabric` et `pdf-lib` sont importés à la demande : les fonctions pures de ce
// fichier restent testables sans eux (tests/design-export.test.mjs).

import { EXPORT_MULTIPLIER, mmToPt } from "./designFormats.js";
import { browserFontResolver, ensureFontsLoaded, mapPageFonts } from "./designFonts.js";
import { replaceQrPlaceholders } from "./designQr.js";

export const PDF_JPEG_QUALITY = 0.95;
export const PNG_SCALE = 2;
export const PNG_MAX_PX = 4000;

// Recadrage « couverture » : l'image remplit le cadre fw × fh (unités) sans
// déformation, centrée, l'excédent est masqué. scale en unités/pixel ;
// width/height = taille du cadre en pixels de l'image source (clipPath local
// centré, modèle de l'éditeur) ; cropX/cropY = marge rognée de chaque côté.
export function coverCrop(imgW, imgH, frameW, frameH) {
  const iw = Math.max(1, Number(imgW) || 0);
  const ih = Math.max(1, Number(imgH) || 0);
  const fw = Math.max(1, Number(frameW) || 0);
  const fh = Math.max(1, Number(frameH) || 0);
  const scale = Math.max(fw / iw, fh / ih);
  const width = Math.min(iw, fw / scale);
  const height = Math.min(ih, fh / scale);
  return { scale, width, height, cropX: (iw - width) / 2, cropY: (ih - height) / 2 };
}

// Taille d'une image posée librement : largeur (ou hauteur) cible `target` unités.
export function fitScale(imgW, imgH, target) {
  const m = Math.max(Number(imgW) || 0, Number(imgH) || 0);
  return m > 0 ? target / m : 1;
}

// Facteur du PNG : 2×, plafonné pour rester raisonnable (PNG_MAX_PX de côté).
export function pngMultiplier(fmt) {
  const side = Math.max(fmt.trimRect.w, fmt.trimRect.h);
  return Math.min(PNG_SCALE, PNG_MAX_PX / side);
}

// Nom de fichier sûr : caractères interdits retirés, « conception » si vide.
export function exportFileName(name, suffix = "") {
  const base =
    String(name ?? "")
      .normalize("NFC")
      // eslint-disable-next-line no-control-regex
      .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/^[.\s]+|[.\s]+$/g, "")
      .slice(0, 80) || "conception";
  return base + suffix;
}

// Zone rendue : toute la face (fond perdu) ou la coupe.
export function renderRect(fmt, trim) {
  return trim ? { ...fmt.trimRect } : { x: 0, y: 0, w: fmt.canvas.w, h: fmt.canvas.h };
}

// data:…;base64,… → octets (pas de fetch : connect-src 'self' refuse data:).
export function dataUrlToBytes(dataUrl) {
  const comma = String(dataUrl).indexOf(",");
  const bin = atob(String(dataUrl).slice(comma + 1));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export class ExportError extends Error {}

async function fontsReady() {
  let ok = false;
  try {
    ok = await ensureFontsLoaded();
  } catch {
    ok = false;
  }
  if (!ok) throw new ExportError("Les polices ne sont pas encore chargées. Réessaie dans un instant.");
}

function walk(objects, fn) {
  for (const o of objects || []) {
    if (!o) continue;
    fn(o);
    if (typeof o.getObjects === "function") walk(o.getObjects(), fn);
    if (o.clipPath) walk([o.clipPath], fn);
  }
}

// Attend que chaque image de la toile soit décodée ; erreur si l'une a échoué.
async function waitForImages(canvas) {
  const elements = [];
  walk(canvas.getObjects(), (o) => {
    if (typeof o.getElement === "function") {
      const el = o.getElement();
      if (el && typeof el.complete === "boolean") elements.push(el);
    }
  });
  await Promise.all(
    elements.map(
      (el) =>
        new Promise((resolve, reject) => {
          if (el.complete) return el.naturalWidth > 0 ? resolve() : reject(new Error("image"));
          el.addEventListener("load", () => resolve(), { once: true });
          el.addEventListener("error", () => reject(new Error("image")), { once: true });
        }),
    ),
  ).catch(() => {
    throw new ExportError("Une photo n'a pas pu être chargée. Vérifie ta connexion et réessaie.");
  });
}

// Rendu d'une face (format stocké, polices logiques) → data URL.
async function renderFaceDataUrl(page, fmt, { multiplier = EXPORT_MULTIPLIER, trim = false, format = "jpeg", quality = PDF_JPEG_QUALITY } = {}) {
  await fontsReady();
  const { StaticCanvas } = await import("fabric");
  const resolver = browserFontResolver();
  const runtimePage = mapPageFonts(page || { objects: [] }, (f) => resolver.toRuntime(f));
  const el = document.createElement("canvas");
  const sc = new StaticCanvas(el, {
    width: fmt.canvas.w,
    height: fmt.canvas.h,
    enableRetinaScaling: false,
    renderOnAddRemove: false,
  });
  try {
    try {
      await sc.loadFromJSON(runtimePage);
    } catch (e) {
      console.error("Export, chargement de la face :", e?.message);
      throw new ExportError("Une photo n'a pas pu être chargée. Vérifie ta connexion et réessaie.");
    }
    try {
      await replaceQrPlaceholders(sc);
    } catch (e) {
      console.error("Export, QR code :", e?.message);
      throw new ExportError("Le QR code n'a pas pu être généré. Vérifie son adresse et réessaie.");
    }
    await waitForImages(sc);
    if (!sc.backgroundColor) sc.backgroundColor = page?.background || "#ffffff";
    sc.renderAll();
    const r = renderRect(fmt, trim);
    return sc.toDataURL({
      format,
      quality,
      multiplier,
      left: r.x,
      top: r.y,
      width: r.w,
      height: r.h,
      enableRetinaScaling: false,
    });
  } finally {
    try {
      sc.dispose();
    } catch {
      /* rien */
    }
  }
}

// Rendu d'une face → Blob (JPEG par défaut, PNG avec format: "png").
export async function renderFace(page, fmt, options = {}) {
  const format = options.format === "png" ? "png" : "jpeg";
  const dataUrl = await renderFaceDataUrl(page, fmt, { ...options, format });
  return new Blob([dataUrlToBytes(dataUrl)], { type: format === "png" ? "image/png" : "image/jpeg" });
}

// Téléchargement via un lien blob: (img-src et navigation autorisent blob:).
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// PDF pour Vistaprint : une page par face (recto puis verso), taille avec fond perdu.
// onProgress(i, total) avant le rendu de chaque face.
export async function exportPdf(pages, fmt, name, { onProgress } = {}) {
  const faces = (pages || []).slice(0, fmt.faces);
  if (!faces.length) throw new ExportError("Rien à exporter.");
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  doc.setTitle(exportFileName(name));
  doc.setCreator("Aux Bonnes Pattes");
  doc.setProducer("Aux Bonnes Pattes");
  const w = mmToPt(fmt.bleedMm.w);
  const h = mmToPt(fmt.bleedMm.h);
  for (let i = 0; i < faces.length; i++) {
    onProgress?.(i, faces.length);
    const dataUrl = await renderFaceDataUrl(faces[i], fmt, {
      multiplier: EXPORT_MULTIPLIER,
      format: "jpeg",
      quality: PDF_JPEG_QUALITY,
    });
    const img = await doc.embedJpg(dataUrlToBytes(dataUrl));
    const p = doc.addPage([w, h]);
    p.drawImage(img, { x: 0, y: 0, width: w, height: h });
  }
  const bytes = await doc.save();
  const filename = exportFileName(name, "-vistaprint.pdf");
  downloadBlob(new Blob([bytes], { type: "application/pdf" }), filename);
  return filename;
}

// PNG de la face, rognée à la coupe, 2×.
export async function exportPng(page, fmt, name) {
  const blob = await renderFace(page, fmt, { multiplier: pngMultiplier(fmt), trim: true, format: "png" });
  const filename = exportFileName(name, ".png");
  downloadBlob(blob, filename);
  return filename;
}
