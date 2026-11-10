import { query } from "./db";
import { isUuid } from "./api";
import { NAME_MAX } from "./designFields";

// Requêtes partagées de l'onglet « Conception » (API et pages admin).
// Les dates sont renvoyées en texte ISO : jamais d'objet Date ambigu côté client.

const LIST_COLUMNS = "id, name, format, orientation, thumbnail, updated_at";
const FULL_COLUMNS = "id, name, format, orientation, pages, thumbnail, created_at, updated_at";

function iso(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normalize(row) {
  if (!row) return null;
  const out = { ...row };
  if ("created_at" in out) out.created_at = iso(out.created_at);
  if ("updated_at" in out) out.updated_at = iso(out.updated_at);
  if ("pages" in out && !Array.isArray(out.pages)) out.pages = [];
  return out;
}

// Liste des conceptions (sans les faces), la plus récemment modifiée d'abord.
export async function listDesigns() {
  const { rows } = await query(`SELECT ${LIST_COLUMNS} FROM designs ORDER BY updated_at DESC NULLS LAST, created_at DESC`);
  return rows.map(normalize);
}

// Conception complète (avec les faces), ou null si introuvable.
export async function loadDesign(id) {
  if (!isUuid(id)) return null;
  const { rows } = await query(`SELECT ${FULL_COLUMNS} FROM designs WHERE id = $1`, [id]);
  return normalize(rows[0]);
}

// Ligne des Réglages, utilisée pour préremplir les modèles (objet vide si absente).
export async function loadDesignSettings() {
  const { rows } = await query("SELECT * FROM settings LIMIT 1");
  return rows[0] || {};
}

export async function insertDesign({ name, format, orientation, pages }) {
  const { rows } = await query(
    `INSERT INTO designs (name, format, orientation, pages)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING ${FULL_COLUMNS}`,
    [name, format, orientation, JSON.stringify(pages)]
  );
  return normalize(rows[0]);
}

// Mise à jour partielle : seuls les champs présents dans `value` sont modifiés.
// Renvoie { id, name, updated_at } ou null si la conception n'existe pas.
export async function updateDesign(id, value) {
  const sets = [];
  const params = [id];
  if (value.name !== undefined) {
    params.push(value.name);
    sets.push(`name = $${params.length}`);
  }
  if (value.pages !== undefined) {
    params.push(JSON.stringify(value.pages));
    sets.push(`pages = $${params.length}::jsonb`);
  }
  if (value.thumbnail !== undefined) {
    params.push(value.thumbnail);
    sets.push(`thumbnail = $${params.length}`);
  }
  sets.push("updated_at = now()");
  const { rows } = await query(
    `UPDATE designs SET ${sets.join(", ")} WHERE id = $1 RETURNING id, name, updated_at`,
    params
  );
  return normalize(rows[0]);
}

export async function deleteDesign(id) {
  const { rowCount } = await query("DELETE FROM designs WHERE id = $1", [id]);
  return rowCount > 0;
}

// Copie « <nom> (copie) » (nom borné), sans les faces dans la réponse.
export async function duplicateDesign(id) {
  const { rows } = await query(
    `INSERT INTO designs (name, format, orientation, pages, thumbnail)
     SELECT left(name || ' (copie)', $2), format, orientation, pages, thumbnail
     FROM designs WHERE id = $1
     RETURNING id, name, format, orientation, thumbnail, created_at, updated_at`,
    [id, NAME_MAX]
  );
  return normalize(rows[0]);
}

export async function insertDesignAsset({ blobUrl, contentType, bytes }) {
  const { rows } = await query(
    "INSERT INTO design_assets (blob_url, content_type, bytes) VALUES ($1, $2, $3) RETURNING id",
    [blobUrl, contentType, bytes]
  );
  return rows[0];
}

export async function loadDesignAsset(id) {
  if (!isUuid(id)) return null;
  const { rows } = await query("SELECT id, blob_url, content_type FROM design_assets WHERE id = $1", [id]);
  return rows[0] || null;
}
