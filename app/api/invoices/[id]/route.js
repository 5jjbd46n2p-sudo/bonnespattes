import { NextResponse } from "next/server";
import { query, tx } from "@/lib/db";
import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { allocateInvoiceNumber, resyncInvoiceSequences } from "@/lib/invoiceNumber";

// Code de commerce / CGI : une facture émise se conserve 10 ans et la
// numérotation doit rester continue. On corrige par un avoir, jamais en supprimant.
const ISSUED_ERROR =
  "Cette facture a été émise : elle ne peut être ni supprimée ni retirée de la comptabilité (obligation légale). Pour l'annuler, établis un avoir.";

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

  // Passage en facture de test : nouveau numéro FT#### ; la suite des vraies factures se referme.
  if (body.isTest === true) {
    try {
      const inv = await tx(async (client) => {
        const cur = await client.query("SELECT id, is_test, status FROM invoices WHERE id = $1 FOR UPDATE", [id]);
        if (!cur.rows[0]) return null;
        if (cur.rows[0].is_test) return cur.rows[0];
        // Une facture émise ne peut pas sortir de la comptabilité (obligation légale).
        if (cur.rows[0].status !== "BROUILLON") return { issued: true };
        const settings = (await client.query("SELECT * FROM settings LIMIT 1 FOR UPDATE")).rows[0];
        const number = await allocateInvoiceNumber(client, settings, true);
        const r = await client.query("UPDATE invoices SET number = $1, is_test = true WHERE id = $2 RETURNING *", [number, id]);
        await resyncInvoiceSequences(client);
        return r.rows[0];
      });
      if (!inv) return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
      if (inv.issued) return NextResponse.json({ error: ISSUED_ERROR }, { status: 409 });
      return NextResponse.json({ invoice: inv });
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "Erreur serveur, réessaie plus tard." }, { status: 500 });
    }
  }

  if (body.status !== undefined) {
    if (!["BROUILLON", "ENVOYEE", "PAYEE", "EN_RETARD"].includes(body.status)) {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }
    if (body.status === "BROUILLON") {
      const cur = await query("SELECT status, is_test FROM invoices WHERE id = $1", [id]);
      if (cur.rows[0] && cur.rows[0].status !== "BROUILLON" && !cur.rows[0].is_test) {
        return NextResponse.json({ error: "Une facture émise ne peut pas redevenir un brouillon. Pour l'annuler, établis un avoir." }, { status: 409 });
      }
    }
  }

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
      const inv = await client.query("SELECT id, number, status, is_test FROM invoices WHERE id = $1 FOR UPDATE", [id]);
      if (!inv.rows[0]) return null;
      if (inv.rows[0].status !== "BROUILLON" && !inv.rows[0].is_test) return { issued: true };
      await client.query("UPDATE client_credits SET used_at = NULL, used_invoice_id = NULL WHERE used_invoice_id = $1", [id]);
      await client.query("DELETE FROM invoices WHERE id = $1", [id]);
      const before = await client.query("SELECT next_invoice_seq + next_test_invoice_seq AS n FROM settings LIMIT 1");
      await resyncInvoiceSequences(client);
      const after = await client.query("SELECT next_invoice_seq + next_test_invoice_seq AS n FROM settings LIMIT 1");
      const renumbered = Number(after.rows[0]?.n) < Number(before.rows[0]?.n);
      return { number: inv.rows[0].number, renumbered };
    });
    if (!result) return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
    if (result.issued) return NextResponse.json({ error: ISSUED_ERROR }, { status: 409 });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Suppression impossible, réessaie dans un instant." }, { status: 500 });
  }
}
