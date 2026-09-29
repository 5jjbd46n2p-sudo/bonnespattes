import { NextResponse } from "next/server";
import { query, tx } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { todayISO } from "@/lib/utils";
import { cleanText, isUuid, parseAmount, parseDateISO, readJson } from "@/lib/api";

export async function POST(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const body = await readJson(req);
  const amount = parseAmount(body.amount);
  if (amount === null) return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
  const date = body.date ? parseDateISO(body.date) : todayISO();
  if (!date) return NextResponse.json({ error: "Date invalide." }, { status: 400 });

  const result = await tx(async (client) => {
    const invRes = await client.query(
      `SELECT i.*, (i.credit_note_of IS NOT NULL OR EXISTS (SELECT 1 FROM invoices cn WHERE cn.credit_note_of = i.id)) AS settled
         FROM invoices i WHERE i.id = $1 FOR UPDATE`,
      [id]
    );
    const invoice = invRes.rows[0];
    if (!invoice) return { status: 404, error: "Facture introuvable." };
    if (invoice.settled) return { status: 409, error: "Facture annulée par un avoir : aucun paiement à enregistrer." };

    const payRes = await client.query(
      `INSERT INTO payments (invoice_id, amount, date, method) VALUES ($1,$2,$3,$4) RETURNING *`,
      [id, amount, date, cleanText(body.method, 50) || "Virement"]
    );
    const totalPaidRes = await client.query(
      "SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE invoice_id = $1",
      [id]
    );
    const totalPaid = Number(totalPaidRes.rows[0].total);
    if (totalPaid >= Number(invoice.total_ttc) && invoice.status !== "PAYEE") {
      await client.query("UPDATE invoices SET status = 'PAYEE' WHERE id = $1", [id]);
    }

    return { payment: payRes.rows[0] };
  });

  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ payment: result.payment });
}
