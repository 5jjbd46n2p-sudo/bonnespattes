import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/api";
import { buildQuotePdf } from "@/lib/quoteDoc";
import { sendQuoteEmail } from "@/lib/email";

export async function POST(_req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
  const q = (await query("SELECT * FROM quotes WHERE id = $1", [id])).rows[0];
  if (!q) return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
  const client = (await query("SELECT * FROM clients WHERE id = $1", [q.client_id])).rows[0];
  if (!client?.email) return NextResponse.json({ error: "Ce client n'a pas d'adresse e-mail." }, { status: 400 });
  const [items, settings] = await Promise.all([
    query("SELECT * FROM quote_items WHERE quote_id = $1 ORDER BY position", [id]),
    query("SELECT * FROM settings LIMIT 1"),
  ]);
  try {
    const bytes = await buildQuotePdf({ quote: q, items: items.rows, client, settings: settings.rows[0] });
    await sendQuoteEmail({
      to: client.email,
      clientName: `${client.first_name} ${client.last_name}`.trim(),
      number: q.number,
      validUntil: q.valid_until,
      message: q.message,
      pdfBase64: Buffer.from(bytes).toString("base64"),
    });
    await query("UPDATE quotes SET sent_to = $1, sent_at = now() WHERE id = $2", [client.email, id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Envoi impossible." }, { status: 500 });
  }
}
