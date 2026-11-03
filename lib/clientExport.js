import { query } from "./db";

// Mise en forme de l'export (fonction pure, testée sans base). Les clés
// historiques restent identiques ; devis et photos sont ajoutés à la fin.
export function assembleClientExport({
  now = new Date(),
  client,
  account,
  requests,
  pets,
  visits,
  invoices,
  deposits,
  contracts,
  credits,
  quotes = [],
  quoteItems = [],
  photos = [],
}) {
  const itemsByQuote = new Map();
  for (const { quote_id, ...item } of quoteItems) {
    if (!itemsByQuote.has(quote_id)) itemsByQuote.set(quote_id, []);
    itemsByQuote.get(quote_id).push(item);
  }
  const devis = quotes.map(({ id, ...q }) => ({
    ...q,
    lignes: (itemsByQuote.get(id) || []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
  }));
  // Jamais l'adresse du stockage privé : elle donnerait un accès indirect au fichier.
  const photoList = photos.map(({ id, created_at, visit_date, pet_name }) => ({ id, created_at, visit_date, pet_name }));

  return {
    export_genere_le: now.toISOString(),
    note: "Ensemble des données personnelles vous concernant traitées par Aux Bonnes Pattes. La liste des photos de visites est incluse ; les fichiers eux-mêmes vous sont envoyés sur simple demande par retour d'email.",
    profil: client,
    compte_espace_client: account || null,
    demandes_de_contact: requests,
    animaux: pets,
    visites: visits,
    factures: invoices,
    acomptes: deposits,
    contrats: contracts,
    parrainage_credits: credits,
    devis,
    photos: photoList,
  };
}

// Export de toutes les données d'un client (RGPD : droit d'accès, art. 15, et portabilité, art. 20).
// Format structuré, lisible par machine (JSON). Les factures de test sont exclues.
export async function buildClientExport(clientId) {
  const clientRes = await query(
    "SELECT first_name, last_name, phone, email, address, notes, hourly_rate, referral_code, created_at FROM clients WHERE id = $1",
    [clientId]
  );
  if (!clientRes.rows[0]) return null;

  // Requêtes indépendantes : exécutées en parallèle
  const [pets, visits, invoices, deposits, contracts, credits, account, requests, quotes, quoteItems, photos] = await Promise.all([
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
    query(
      `SELECT id, number, issue_date, valid_until, status, tva_rate, total_ht, total_tva, total_ttc, message,
              sent_to, sent_at, accepted_at
       FROM quotes WHERE client_id = $1 ORDER BY issue_date DESC, number DESC`,
      [clientId]
    ),
    query(
      `SELECT qi.quote_id, qi.description, qi.quantity, qi.unit_price, qi.total, qi.position
       FROM quote_items qi JOIN quotes q ON q.id = qi.quote_id WHERE q.client_id = $1`,
      [clientId]
    ),
    query(
      `SELECT ph.id, ph.created_at, v.date AS visit_date, p.name AS pet_name
       FROM photos ph JOIN visits v ON v.id = ph.visit_id LEFT JOIN pets p ON p.id = v.pet_id
       WHERE v.client_id = $1 ORDER BY ph.created_at DESC`,
      [clientId]
    ),
  ]);

  return assembleClientExport({
    client: clientRes.rows[0],
    account: account.rows[0],
    requests: requests.rows,
    pets: pets.rows,
    visits: visits.rows,
    invoices: invoices.rows,
    deposits: deposits.rows,
    contracts: contracts.rows,
    credits: credits.rows,
    quotes: quotes.rows,
    quoteItems: quoteItems.rows,
    photos: photos.rows,
  });
}
