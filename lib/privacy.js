import { del } from "@vercel/blob";
import { query, tx } from "./db";
import { audit } from "./audit";

// Durées de conservation (affichées aussi dans la politique de confidentialité).
export const RETENTION = {
  // Fiche client active : anonymisée 3 ans après la dernière prestation
  clientInactiveYears: 3,
  // Contrats signés : preuve conservée 5 ans après la dernière prestation
  // (délai de prescription de droit commun, article 2224 du Code civil)
  signedContractYears: 5,
  // Demandes de contact et de devis restées sans suite
  leadYears: 3,
  // Liens de contrat jamais signés, après leur expiration
  unsignedContractDays: 90,
  // Traces anti-attaque (empreintes d'IP)
  rateLimitDays: 2,
};

export async function deleteBlobs(urls) {
  for (const url of urls) {
    try {
      await del(url);
    } catch (e) {
      console.warn("Suppression d'une photo échouée (ignorée) :", e.message);
    }
  }
}

// Photos (fichiers) des visites indiquées : à supprimer du stockage en même
// temps que les visites, sinon les fichiers resteraient indéfiniment.
export async function visitPhotoUrls(db, whereSql, params) {
  const { rows } = await db.query(
    `SELECT ph.url FROM photos ph JOIN visits v ON v.id = ph.visit_id WHERE ${whereSql}`,
    params
  );
  return rows.map((r) => r.url);
}

// Droit à l'effacement (RGPD) et fin de la durée de conservation.
// - Client sans facture ni contrat signé : supprimé entièrement.
// - Client avec factures (conservées 10 ans, avec le nom et l'adresse du client)
//   ou avec un contrat signé (preuve conservée 5 ans, verrouillé en base) : tout
//   le reste est effacé et la fiche est marquée « anonymisée ».
// Renvoie "deleted", "anonymized" ou null si le client n'existe pas.
export async function eraseClient(clientId, actorId = null) {
  const photos = await query(
    "SELECT ph.url FROM photos ph JOIN visits v ON v.id = ph.visit_id WHERE v.client_id = $1",
    [clientId]
  );

  const mode = await tx(async (db) => {
    const c = await db.query("SELECT id FROM clients WHERE id = $1 FOR UPDATE", [clientId]);
    if (!c.rows[0]) return null;
    // Les demandes de contact liées contiennent aussi ses coordonnées.
    await db.query("DELETE FROM leads WHERE client_id = $1", [clientId]);
    const inv = await db.query("SELECT 1 FROM invoices WHERE client_id = $1 LIMIT 1", [clientId]);
    const signed = await db.query("SELECT 1 FROM contract_signatures WHERE client_id = $1 AND status = 'SIGNE' LIMIT 1", [clientId]);
    if (!inv.rows[0] && !signed.rows[0]) {
      await db.query("DELETE FROM clients WHERE id = $1", [clientId]);
      await audit(db, { actorId, action: "client.delete", entity: "client", entityId: clientId });
      return "deleted";
    }
    await db.query("DELETE FROM users WHERE client_id = $1", [clientId]);
    // Dernière prestation mémorisée avant d'effacer les visites : la durée de
    // conservation des contrats signés se compte à partir de cette date.
    await db.query(
      `UPDATE clients SET last_activity_at = GREATEST(last_activity_at,
              (SELECT MAX(v.date)::timestamptz FROM visits v WHERE v.client_id = $1))
        WHERE id = $1`,
      [clientId]
    );
    await db.query("DELETE FROM visits WHERE client_id = $1", [clientId]); // tâches et photos en cascade
    await db.query("DELETE FROM pets WHERE client_id = $1", [clientId]);
    await db.query("DELETE FROM contract_signatures WHERE client_id = $1 AND status <> 'SIGNE'", [clientId]);
    await db.query("DELETE FROM deposits WHERE client_id = $1 AND invoice_id IS NULL", [clientId]);
    await db.query("DELETE FROM client_credits WHERE client_id = $1 AND used_invoice_id IS NULL", [clientId]);
    await db.query(
      `UPDATE clients SET phone = '', email = '', notes = '', referral_code = NULL,
              distance_km = NULL, travel_minutes = NULL, anonymized_at = now()
        WHERE id = $1`,
      [clientId]
    );
    await audit(db, { actorId, action: "client.anonymize", entity: "client", entityId: clientId });
    return "anonymized";
  });

  if (mode) await deleteBlobs(photos.rows.map((p) => p.url));
  return mode;
}

// Application automatique des durées de conservation (tâche quotidienne).
export async function applyRetention() {
  const report = {};

  const leads = await query(
    "DELETE FROM leads WHERE created_at < now() - make_interval(years => $1) RETURNING id",
    [RETENTION.leadYears]
  );
  report.leadsDeleted = leads.rowCount;

  const unsigned = await query(
    `DELETE FROM contract_signatures
      WHERE status <> 'SIGNE' AND expires_at < now() - make_interval(days => $1) RETURNING id`,
    [RETENTION.unsignedContractDays]
  );
  report.unsignedContractsDeleted = unsigned.rowCount;

  const hits = await query(
    "DELETE FROM rate_limit_hits WHERE created_at < now() - make_interval(days => $1)",
    [RETENTION.rateLimitDays]
  );
  report.rateLimitRowsDeleted = hits.rowCount;

  // Dernière activité d'un client : dernière visite (mémorisée à l'anonymisation,
  // qui efface les visites), facture ou création de la fiche.
  const lastActivity = `GREATEST(
      c.created_at,
      COALESCE(c.last_activity_at, 'epoch'),
      COALESCE((SELECT MAX(v.date)::timestamptz FROM visits v WHERE v.client_id = c.id), 'epoch'),
      COALESCE((SELECT MAX(i.issue_date)::timestamptz FROM invoices i WHERE i.client_id = c.id), 'epoch'))`;

  const inactive = await query(
    `SELECT c.id FROM clients c
      WHERE c.anonymized_at IS NULL AND ${lastActivity} < now() - make_interval(years => $1)`,
    [RETENTION.clientInactiveYears]
  );
  report.clientsErased = { deleted: 0, anonymized: 0 };
  for (const { id } of inactive.rows) {
    const mode = await eraseClient(id);
    if (mode) report.clientsErased[mode] += 1;
  }

  // Les contrats signés sont verrouillés en base : seule cette purge, dans une
  // transaction marquée app.retention = 'on', peut les supprimer.
  const oldContracts = await tx(async (db) => {
    await db.query("SELECT set_config('app.retention', 'on', true)");
    return db.query(
      `DELETE FROM contract_signatures s USING clients c
        WHERE s.client_id = c.id AND s.status = 'SIGNE'
          AND ${lastActivity} < now() - make_interval(years => $1) RETURNING s.id`,
      [RETENTION.signedContractYears]
    );
  });
  report.signedContractsDeleted = oldContracts.rowCount;

  return report;
}
