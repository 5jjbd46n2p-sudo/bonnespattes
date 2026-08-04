import { NextResponse } from "next/server";
import { query, tx } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  const { amount, date, method } = await req.json();
  if (!amount || Number(amount) <= 0) {
    return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
  }

  const result = await tx(async (client) => {
    const payRes = await client.query(
      `INSERT INTO payments (invoice_id, amount, date, method) VALUES ($1,$2,$3,$4) RETURNING *`,
      [id, amount, date || new Date().toISOString().slice(0, 10), method || "Virement"]
    );

    const invRes = await client.query("SELECT * FROM invoices WHERE id = $1", [id]);
    const invoice = invRes.rows[0];
    const totalPaidRes = await client.query(
      "SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE invoice_id = $1",
      [id]
    );
    const totalPaid = Number(totalPaidRes.rows[0].total);
    if (totalPaid >= Number(invoice.total_ttc) && invoice.status !== "PAYEE") {
      await client.query("UPDATE invoices SET status = 'PAYEE' WHERE id = $1", [id]);
    }

    return payRes.rows[0];
  });

  return NextResponse.json({ payment: result });
}
