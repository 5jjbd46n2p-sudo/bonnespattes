import { query } from "@/lib/db";

// Avancement des checklists des documents (onglet « Documents »).
// La table est créée à la première utilisation : aucune migration manuelle n'est nécessaire.
let ready = null;
function ensureTable() {
  if (!ready) {
    ready = query(
      `CREATE TABLE IF NOT EXISTS doc_checklist (
         doc TEXT NOT NULL,
         item TEXT NOT NULL,
         done_at TIMESTAMPTZ NOT NULL DEFAULT now(),
         PRIMARY KEY (doc, item)
       )`
    ).catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

// Identifiants cochés d'un document ; liste vide si la base est indisponible.
export async function loadDone(slug) {
  try {
    await ensureTable();
    const { rows } = await query("SELECT item FROM doc_checklist WHERE doc = $1", [slug]);
    return rows.map((r) => r.item);
  } catch (e) {
    console.error("doc_checklist :", e?.message);
    return [];
  }
}

export async function setDone(slug, item, done) {
  await ensureTable();
  if (done) {
    await query("INSERT INTO doc_checklist (doc, item) VALUES ($1, $2) ON CONFLICT (doc, item) DO NOTHING", [slug, item]);
  } else {
    await query("DELETE FROM doc_checklist WHERE doc = $1 AND item = $2", [slug, item]);
  }
}
