import { del } from "@vercel/blob";
import { query, tx } from "./db";

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

async function deleteBlobs(urls) {
  for (const url of urls) {
    try {
      await del(url);
    } catch (e) {
      console.warn("Suppression d'une photo échouée (ignorée) :", e.message);
    }
  }
}

// Droit à l'effacement (RGPD) et fin de la durée de conservation.
// - Client sans facture : supprimé entièrement.
// - Client avec factures : la loi impose de garder les factures 10 ans (avec
//   le nom et l'adresse du client qui y figurent). Tout le reste est effacé et
//   la fiche est marquée « anonymisée ».
// Renvoie "deleted", "anonymized" ou null si le client n'existe pas.
export async function eraseClient(clientId) {
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
    if (!inv.rows[0]) {
      await db.query("DELETE FROM clients WHERE id = $1", [clientId]);
      return "deleted";
    }
    await db.query("DELETE FROM users WHERE client_id = $1", [clientId]);
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

  // Dernière activité d'un client : dernière visite, facture ou création de la fiche.
  const lastActivity = `GREATEST(
      c.created_at,
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

  const oldContracts = await query(
    `DELETE FROM contract_signatures s USING clients c
      WHERE s.client_id = c.id AND s.status = 'SIGNE'
        AND ${lastActivity} < now() - make_interval(years => $1) RETURNING s.id`,
    [RETENTION.signedContractYears]
  );
  report.signedContractsDeleted = oldContracts.rowCount;

  return report;
}
