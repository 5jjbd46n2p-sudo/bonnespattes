import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin, getCurrentUser } from "@/lib/auth";

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;

  const invRes = await query(
    `SELECT i.*, c.first_name, c.last_name, c.address, c.email AS client_email
     FROM invoices i JOIN clients c ON c.id = i.client_id WHERE i.id = $1`,
    [id]
  );
  const invoice = invRes.rows[0];
  if (!invoice) return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
  if (user.role === "CLIENT" && invoice.client_id !== user.client_id) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  const itemsRes = await query("SELECT * FROM invoice_items WHERE invoice_id = $1", [id]);
  const paymentsRes = await query(
    "SELECT * FROM payments WHERE invoice_id = $1 ORDER BY date DESC",
    [id]
  );

  return NextResponse.json({ invoice, items: itemsRes.rows, payments: paymentsRes.rows });
}

export async function PATCH(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const map = { status: "status", notes: "notes", dueDate: "due_date" };
  const sets = [];
  const values = [];
  let i = 1;
  for (const [key, col] of Object.entries(map)) {
    if (body[key] !== undefined) {
      sets.push(`${col} = $${i++}`);
      values.push(body[key]);
    }
  }
  if (!sets.length) return NextResponse.json({ error: "Rien à mettre à jour." }, { status: 400 });
  values.push(id);
  const { rows } = await query(`UPDATE invoices SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`, values);
  return NextResponse.json({ invoice: rows[0] });
}

export async function DELETE(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  await query("DELETE FROM invoices WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
