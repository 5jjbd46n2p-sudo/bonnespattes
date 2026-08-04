import { query } from "@/lib/db";
import NewInvoiceForm from "@/components/NewInvoiceForm";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({ searchParams }) {
  const sp = await searchParams;
  const preselectedClientId = sp.clientId || "";

  const clientsRes = await query("SELECT id, first_name, last_name FROM clients ORDER BY last_name");
  const settingsRes = await query("SELECT * FROM settings LIMIT 1");

  let unbilledVisits = [];
  if (preselectedClientId) {
    const visitsRes = await query(
      `SELECT v.*, p.name AS pet_name FROM visits v JOIN pets p ON p.id = v.pet_id
       WHERE v.client_id = $1 AND v.invoice_id IS NULL AND v.status = 'FAIT'
       ORDER BY v.date ASC`,
      [preselectedClientId]
    );
    unbilledVisits = visitsRes.rows;
  }

  return (
    <NewInvoiceForm
      clients={clientsRes.rows}
      settings={settingsRes.rows[0]}
      preselectedClientId={preselectedClientId}
      initialUnbilledVisits={unbilledVisits}
    />
  );
}
