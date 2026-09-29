// Petits utilitaires partagés par les routes d'API.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Identifiant de base (UUID) bien formé : à vérifier avant toute requête SQL,
// sinon Postgres lève une erreur et la route répond 500 au lieu de 404.
export function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

// Corps JSON de la requête, ou objet vide s'il est absent ou mal formé
// (les validations de chaque route renvoient alors une erreur 400 claire).
export async function readJson(req) {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : {};
  } catch {
    return {};
  }
}

// Montant strictement positif (ou null si invalide), arrondi au centime.
export function parseAmount(value) {
  const n = Number(value);
  if (value === "" || value === null || value === undefined || !Number.isFinite(n) || n <= 0 || n > 1_000_000) {
    return null;
  }
  return Math.round(n * 100) / 100;
}

// Date "YYYY-MM-DD" valide, ou null.
export function parseDateISO(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value ? null : value;
}

// Texte libre nettoyé et borné ("" si absent ou d'un autre type).
export function cleanText(value, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
