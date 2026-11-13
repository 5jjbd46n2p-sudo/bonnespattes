// Formats d'impression de l'onglet Conception (règles Vistaprint) et conversions
// d'unités. Logique pure, testée par tests/design.test.mjs.
//
// Unités de conception : 10 unités = 1 mm. L'origine (0,0) est le coin du fond
// perdu ; le trait de coupe est à 15 unités du bord, la zone de sécurité à 30.

export const UNITS_PER_MM = 10;
export const BLEED_MM = 1.5; // fond perdu, de chaque côté
export const SAFE_MM = 1.5; // marge de sécurité à l'intérieur de la coupe
export const EXPORT_DPI = 300;
// Facteur Fabric (toDataURL multiplier) pour passer des unités aux pixels à 300 dpi.
export const EXPORT_MULTIPLIER = EXPORT_DPI / 25.4 / UNITS_PER_MM;

// Tailles finies (coupe) dans l'orientation naturelle du format.
// Flyer A4 : 1,5 mm de fond perdu comme les autres (213 × 300 mm), à confirmer
// sur la page produit Vistaprint ; la valeur ne vit qu'ici.
export const FORMATS = {
  CARTE: { key: "CARTE", label: "Carte de visite", w: 85, h: 55, faces: 2, orientation: "paysage" },
  A5: { key: "A5", label: "Flyer A5", w: 148, h: 210, faces: 2, orientation: "portrait" },
  A4: { key: "A4", label: "Flyer A4", w: 210, h: 297, faces: 1, orientation: "portrait" },
};

export const FACE_LABELS = ["Recto", "Verso"];

const ORIENTATIONS = ["portrait", "paysage"];

function round(n, digits = 4) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

// Format complet pour une orientation donnée ; null si la clé est inconnue.
// Une orientation absente ou invalide vaut l'orientation naturelle du format.
export function getFormat(key, orientation) {
  const base = Object.prototype.hasOwnProperty.call(FORMATS, key) ? FORMATS[key] : null;
  if (!base) return null;
  const orient = ORIENTATIONS.includes(orientation) ? orientation : base.orientation;
  const swap = orient !== base.orientation;
  const trimMm = swap ? { w: base.h, h: base.w } : { w: base.w, h: base.h };
  const bleedMm = { w: round(trimMm.w + 2 * BLEED_MM), h: round(trimMm.h + 2 * BLEED_MM) };
  const safeMm = { w: round(trimMm.w - 2 * SAFE_MM), h: round(trimMm.h - 2 * SAFE_MM) };
  const u = (mm) => round(mm * UNITS_PER_MM);
  const bleedU = u(BLEED_MM);
  const safeU = u(BLEED_MM + SAFE_MM);
  return {
    key: base.key,
    label: base.label,
    faces: base.faces,
    orientation: orient,
    trimMm,
    bleedMm,
    safeMm,
    canvas: { w: u(bleedMm.w), h: u(bleedMm.h) },
    trimRect: { x: bleedU, y: bleedU, w: u(trimMm.w), h: u(trimMm.h) },
    safeRect: { x: safeU, y: safeU, w: u(safeMm.w), h: u(safeMm.h) },
  };
}

// Millimètres → pixels à la résolution donnée (arrondi au pixel).
export function mmToPx(mm, dpi = EXPORT_DPI) {
  return Math.round((mm / 25.4) * dpi);
}

// Millimètres → points PDF (1 pt = 1/72 pouce), non arrondi.
export function mmToPt(mm) {
  return (mm / 25.4) * 72;
}

// Taille en pixels à 300 dpi du fichier avec fond perdu (ex. carte 1039 × 685).
export function exportPixelSize(fmt) {
  return { w: mmToPx(fmt.bleedMm.w), h: mmToPx(fmt.bleedMm.h) };
}

// bounds = { left, top, width, height } en unités (boîte englobante de l'objet).
// true si une partie de l'objet sort de la zone de sécurité.
export function isOutsideSafe(bounds, fmt) {
  if (!bounds || !fmt) return false;
  const eps = 0.01;
  const s = fmt.safeRect;
  const left = Number(bounds.left) || 0;
  const top = Number(bounds.top) || 0;
  const width = Number(bounds.width) || 0;
  const height = Number(bounds.height) || 0;
  return (
    left < s.x - eps ||
    top < s.y - eps ||
    left + width > s.x + s.w + eps ||
    top + height > s.y + s.h + eps
  );
}

// Propriétés maison à sérialiser avec canvas.toObject(SERIALIZE_PROPS).
export const SERIALIZE_PROPS = ["abpRole", "abpLocked", "abpQrText"];

// Palette « carnet de balade » (app/globals.css).
export const PALETTE = [
  { name: "Papier", hex: "#f7f2ea" },
  { name: "Lin", hex: "#fffcf7" },
  { name: "Sable", hex: "#efe7da" },
  { name: "Encre", hex: "#1f1a15" },
  { name: "Pierre", hex: "#6e655a" },
  { name: "Rouille", hex: "#a8481f" },
  { name: "Rouille foncé", hex: "#8a3a18" },
  { name: "Mousse", hex: "#4f6b3a" },
  { name: "Miel", hex: "#d69a4e" },
  { name: "Blanc", hex: "#ffffff" },
];
