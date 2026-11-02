import { query } from "./db";

// Journal d'audit des actions sensibles (table audit_log, en ajout seul).
// Aucune donnée personnelle dans `details` : identifiants, numéros de facture
// et noms de champs uniquement.
export const AUDIT_ACTIONS = [
  "invoice.create",
  "invoice.issue",
  "invoice.payment",
  "invoice.update_notes",
  "invoice.update_due_date",
  "invoice.credit_note",
  "invoice.replace",
  "client.delete",
  "client.anonymize",
  "settings.sensitive_change",
  "contract.send",
  "contract.sign",
  "contract.cancel",
  "contract.integrity_failure",
  "mfa.enable",
  "mfa.disable",
  "mfa.backup_code_used",
  "mfa.backup_codes_regenerated",
];

const SQL =
  "INSERT INTO audit_log (actor_id, action, entity, entity_id, details) VALUES ($1, $2, $3, $4, $5::jsonb)";

// `db` : client d'une transaction tx() (l'action et sa trace sont alors
// atomiques : une erreur ici annule l'action), ou null hors transaction
// (l'erreur est alors seulement journalisée, l'action n'échoue pas).
export async function audit(db, { actorId = null, action, entity, entityId = null, details = {} }) {
  if (!AUDIT_ACTIONS.includes(action)) throw new Error(`Action d'audit inconnue : ${action}`);
  const params = [actorId, action, entity, entityId === null ? null : String(entityId), JSON.stringify(details || {})];
  if (db) {
    await db.query(SQL, params);
    return;
  }
  try {
    await query(SQL, params);
  } catch (e) {
    console.error("Journal d'audit non écrit :", e?.message);
  }
}
