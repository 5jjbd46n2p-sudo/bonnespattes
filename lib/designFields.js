// Validation des entrées de l'API Conception (partagée par les routes).
// Logique pure, testée par tests/design.test.mjs.

import { FORMATS } from "./designFormats.js";
import { TEMPLATES } from "./designTemplates.js";

export const MAX_PAGES_BYTES = 2_000_000;
export const MAX_THUMBNAIL_CHARS = 80_000;
export const NAME_MAX = 80;

const ORIENTATIONS = ["portrait", "paysage"];
const THUMBNAIL_RE = /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/;

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isEmpty(v) {
  return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
}

function checkName(raw) {
  if (typeof raw !== "string") return { error: "Nom invalide." };
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) return { error: "Le nom est obligatoire." };
  if (name.length > NAME_MAX) return { error: `Le nom ne doit pas dépasser ${NAME_MAX} caractères.` };
  return { value: name };
}

// { name, format, orientation, templateId } → { value } ou { error }.
// Avec un modèle, l'orientation est celle du modèle (les modèles sont dessinés
// pour une seule orientation).
export function parseDesignCreate(body) {
  if (!isPlainObject(body)) return { error: "Requête invalide." };

  let name = "Sans titre";
  if (!isEmpty(body.name)) {
    const r = checkName(body.name);
    if (r.error) return r;
    name = r.value;
  } else if (body.name !== undefined && body.name !== null && typeof body.name !== "string") {
    return { error: "Nom invalide." };
  }

  const format = body.format;
  if (typeof format !== "string" || !Object.prototype.hasOwnProperty.call(FORMATS, format)) {
    return { error: "Choisis un format : carte de visite, flyer A5 ou flyer A4." };
  }

  let orientation = FORMATS[format].orientation;
  if (!isEmpty(body.orientation)) {
    if (!ORIENTATIONS.includes(body.orientation)) return { error: "Orientation invalide." };
    orientation = body.orientation;
  }

  let templateId = null;
  if (!isEmpty(body.templateId)) {
    const tpl = typeof body.templateId === "string" ? TEMPLATES.find((t) => t.id === body.templateId) : null;
    if (!tpl || tpl.format !== format) return { error: "Modèle inconnu pour ce format." };
    templateId = tpl.id;
    orientation = tpl.orientation;
  }

  return { value: { name, format, orientation, templateId } };
}

function byteLength(str) {
  return new TextEncoder().encode(str).length;
}

// { name?, pages?, thumbnail? } → { value } (seulement les champs fournis) ou { error }.
// thumbnail: null efface la vignette.
export function parseDesignPatch(body) {
  if (!isPlainObject(body)) return { error: "Requête invalide." };
  const value = {};

  if (body.name !== undefined) {
    const r = checkName(body.name);
    if (r.error) return r;
    value.name = r.value;
  }

  if (body.pages !== undefined) {
    const pages = body.pages;
    if (!Array.isArray(pages) || pages.length < 1 || pages.length > 2) {
      return { error: "Faces invalides." };
    }
    for (const p of pages) {
      if (!isPlainObject(p) || !Array.isArray(p.objects)) return { error: "Faces invalides." };
    }
    let json;
    try {
      json = JSON.stringify(pages);
    } catch {
      return { error: "Faces invalides." };
    }
    if (byteLength(json) > MAX_PAGES_BYTES) {
      return { error: "La conception est trop lourde (2 Mo maximum). Retire quelques éléments puis réessaie." };
    }
    value.pages = pages;
  }

  if (body.thumbnail !== undefined) {
    if (body.thumbnail === null) {
      value.thumbnail = null;
    } else if (typeof body.thumbnail !== "string") {
      return { error: "Vignette invalide." };
    } else if (body.thumbnail.length > MAX_THUMBNAIL_CHARS) {
      return { error: "Vignette trop lourde." };
    } else if (!THUMBNAIL_RE.test(body.thumbnail)) {
      return { error: "Vignette invalide." };
    } else {
      value.thumbnail = body.thumbnail;
    }
  }

  if (Object.keys(value).length === 0) return { error: "Rien à enregistrer." };
  return { value };
}
