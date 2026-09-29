import { query } from "@/lib/db";

// Export de toutes les données d'un client (RGPD : droit d'accès, art. 15, et portabilité, art. 20).
// Format structuré, lisible par machine (JSON). Les factures de test sont exclues.
export async function buildClientExport(clientId) {
  const clientRes = await query(
    "SELECT first_name, last_name, phone, email, address, notes, hourly_rate, referral_code, created_at FROM clients WHERE id = $1",
    [clientId]
  );
  if (!clientRes.rows[0]) return null;

  // Requêtes indépendantes : exécutées en parallèle
  const [pets, visits, invoices, deposits, contracts, credits, account, requests] = await Promise.all([
    query(
      "SELECT name, species, breed, notes, sterilized, identified, identification_number, age_info, diet, health_conditions, created_at FROM pets WHERE client_id = $1 ORDER BY created_at",
      [clientId]
    ),
    query(
      `SELECT v.date, v.start_time, v.end_time, v.status, v.notes, v.price, v.travel_fee, v.is_free, p.name AS pet_name,
              (SELECT COUNT(*)::int FROM photos ph WHERE ph.visit_id = v.id) AS nombre_de_photos
       FROM visits v JOIN pets p ON p.id = v.pet_id WHERE v.client_id = $1 ORDER BY v.date DESC`,
      [clientId]
    ),
    query(
      "SELECT number, issue_date, due_date, status, total_ht, total_tva, total_ttc FROM invoices WHERE client_id = $1 AND NOT is_test ORDER BY issue_date DESC",
      [clientId]
    ),
    query("SELECT amount, date, method, notes FROM deposits WHERE client_id = $1 ORDER BY date DESC", [clientId]),
    query(
      `SELECT version, status, sent_to, sent_at, signed_at, signer_name, signer_ip, signer_user_agent,
              checkboxes, emergency_contact, vet_info
       FROM contract_signatures WHERE client_id = $1 ORDER BY created_at DESC`,
      [clientId]
    ),
    query(
      "SELECT amount, reason, used_at, created_at FROM client_credits WHERE client_id = $1 ORDER BY created_at DESC",
      [clientId]
    ),
    query("SELECT email, created_at, password_changed_at FROM users WHERE client_id = $1", [clientId]),
    query(
      "SELECT kind, name, email, phone, commune, animals, service, message, quote, created_at FROM leads WHERE client_id = $1 ORDER BY created_at",
      [clientId]
    ),
  ]);

  return {
    export_genere_le: new Date().toISOString(),
    note: "Ensemble des données personnelles vous concernant traitées par Aux Bonnes Pattes. Les photos de visites ne sont pas jointes : demandez-les par retour d'email.",
    profil: clientRes.rows[0],
    compte_espace_client: account.rows[0] || null,
    demandes_de_contact: requests.rows,
    animaux: pets.rows,
    visites: visits.rows,
    factures: invoices.rows,
    acomptes: deposits.rows,
    contrats: contracts.rows,
    parrainage_credits: credits.rows,
  };
}
