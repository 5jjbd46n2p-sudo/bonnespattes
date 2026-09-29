import { NextResponse } from "next/server";
import { query, tx } from "@/lib/db";
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

// Suppression (pensée pour les factures de test) : les visites redeviennent « à facturer »,
// les acomptes redeviennent disponibles, les crédits de parrainage sont rendus, et si c'est
// la dernière facture émise, la numérotation revient en arrière (pas de trou dans la suite).
export async function DELETE(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
  try {
    const result = await tx(async (client) => {
      const inv = await client.query("SELECT id, number FROM invoices WHERE id = $1 FOR UPDATE", [id]);
      if (!inv.rows[0]) return null;
      const st = await client.query("SELECT id, invoice_prefix, next_invoice_seq FROM settings LIMIT 1 FOR UPDATE");
      const s = st.rows[0];
      await client.query("UPDATE client_credits SET used_at = NULL, used_invoice_id = NULL WHERE used_invoice_id = $1", [id]);
      await client.query("DELETE FROM invoices WHERE id = $1", [id]);
      let renumbered = false;
      if (s) {
        const last = `${s.invoice_prefix}${String(s.next_invoice_seq - 1).padStart(4, "0")}`;
        if (s.next_invoice_seq > 1 && inv.rows[0].number === last) {
          await client.query("UPDATE settings SET next_invoice_seq = next_invoice_seq - 1 WHERE id = $1", [s.id]);
          renumbered = true;
        }
      }
      return { number: inv.rows[0].number, renumbered };
    });
    if (!result) return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Suppression impossible, réessaie dans un instant." }, { status: 500 });
  }
}
