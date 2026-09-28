import { query } from "@/lib/db";
import { requireClient } from "@/lib/auth";

// Droit à la portabilité des données (article 20 RGPD) : permet à un client
// de télécharger lui-même l'ensemble des données le concernant, dans un
// format structuré et lisible par machine (JSON).
export async function GET() {
  const user = await requireClient();
  if (!user) return new Response(JSON.stringify({ error: "Non autorisé." }), { status: 401 });
  const clientId = user.client_id;

  const clientRes = await query(
    "SELECT first_name, last_name, phone, email, address, notes, hourly_rate, created_at FROM clients WHERE id = $1",
    [clientId]
  );
  const petsRes = await query(
    "SELECT name, species, breed, notes, created_at FROM pets WHERE client_id = $1",
    [clientId]
  );
  const visitsRes = await query(
    `SELECT v.date, v.start_time, v.end_time, v.status, v.notes, v.price, p.name AS pet_name
     FROM visits v JOIN pets p ON p.id = v.pet_id WHERE v.client_id = $1 ORDER BY v.date DESC`,
    [clientId]
  );
  const invoicesRes = await query(
    "SELECT number, issue_date, due_date, status, total_ht, total_tva, total_ttc FROM invoices WHERE client_id = $1 ORDER BY issue_date DESC",
    [clientId]
  );
  const depositsRes = await query(
    "SELECT amount, date, method, notes FROM deposits WHERE client_id = $1 ORDER BY date DESC",
    [clientId]
  );

  const exportData = {
    export_genere_le: new Date().toISOString(),
    profil: clientRes.rows[0] || null,
    animaux: petsRes.rows,
    visites: visitsRes.rows,
    factures: invoicesRes.rows,
    acomptes: depositsRes.rows,
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mes-donnees.json"`,
    },
  });
}
