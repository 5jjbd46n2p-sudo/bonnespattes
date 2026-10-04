import { NextResponse } from "next/server";
import { query, tx } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isUuid, cleanText, readJson } from "@/lib/api";
import { buildQuotePdf, quoteItemsFromVisits, QUOTE_VALIDITY_DAYS } from "@/lib/quoteDoc";
import { sendQuoteEmail } from "@/lib/email";

const cents = (n) => Math.round(n * 100) / 100;

export async function POST(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  const body = await readJson(req);
  const visitIds = Array.isArray(body.visitIds) ? [...new Set(body.visitIds)] : [];
  if (visitIds.length === 0 || visitIds.length > 200 || !visitIds.every(isUuid)) {
    return NextResponse.json({ error: "Choisis au moins une visite." }, { status: 400 });
  }
  const message = cleanText(body.message, 3000);
  const send = body.send !== false;

  try {
    const created = await tx(async (db) => {
      const client = (await db.query("SELECT * FROM clients WHERE id = $1", [id])).rows[0];
      if (!client) return { status: 404, error: "Client introuvable." };
      if (send && !client.email) return { status: 400, error: "Ce client n'a pas d'adresse e-mail. Décoche l'envoi pour créer seulement le PDF." };
      const visits = (
        await db.query(
          `SELECT v.id, v.price, v.travel_fee, v.is_free, v.discount_percent, v.invoice_id, v.status,
                  to_char(v.date, 'DD/MM/YYYY') AS date_fr, p.name AS pet_name,
                  CASE WHEN v.start_time IS NOT NULL AND v.end_time IS NOT NULL
                       THEN EXTRACT(EPOCH FROM (v.end_time - v.start_time)) / 60 END AS minutes
           FROM visits v JOIN pets p ON p.id = v.pet_id
           WHERE v.client_id = $1 AND v.id = ANY($2::uuid[]) ORDER BY v.date, v.start_time NULLS LAST`,
          [id, visitIds]
        )
      ).rows;
      if (visits.length !== visitIds.length) return { status: 404, error: "Une des visites est introuvable." };
      if (visits.some((v) => v.invoice_id || v.status === "ANNULE")) {
        return { status: 400, error: "Une des visites est déjà facturée ou annulée." };
      }
      const settings = (await db.query("SELECT * FROM settings LIMIT 1 FOR UPDATE")).rows[0];
      const seq = settings.next_quote_seq || 1;
      await db.query("UPDATE settings SET next_quote_seq = $1 WHERE id = $2", [seq + 1, settings.id]);
      const number = `D${String(seq).padStart(4, "0")}`;

      const items = quoteItemsFromVisits(visits).map((it) => ({ ...it, unitPrice: cents(it.unitPrice) }));
      const tva = Number(settings.default_tva_rate) || 0;
      const totalHT = cents(items.reduce((s, it) => s + it.unitPrice, 0));
      const totalTVA = cents(totalHT * (tva / 100));
      const totalTTC = cents(totalHT + totalTVA);
      const qRes = await db.query(
        `INSERT INTO quotes (client_id, number, valid_until, tva_rate, total_ht, total_tva, total_ttc, message)
         VALUES ($1,$2, CURRENT_DATE + $3::int, $4,$5,$6,$7,$8) RETURNING *`,
        [id, number, QUOTE_VALIDITY_DAYS, tva, totalHT, totalTVA, totalTTC, message]
      );
      const quote = qRes.rows[0];
      await db.query(
        `INSERT INTO quote_items (quote_id, description, quantity, unit_price, total, position)
         SELECT $1, d, 1, u, u, p - 1 FROM unnest($2::text[], $3::numeric[]) WITH ORDINALITY AS x(d, u, p)`,
        [quote.id, items.map((i) => i.description), items.map((i) => i.unitPrice)]
      );
      const itemRows = (await db.query("SELECT * FROM quote_items WHERE quote_id = $1 ORDER BY position", [quote.id])).rows;
      return { quote, items: itemRows, client, settings };
    });
    if (created.error) return NextResponse.json({ error: created.error }, { status: created.status });

    let emailed = false;
    let emailError = "";
    if (send) {
      try {
        const bytes = await buildQuotePdf(created);
        await sendQuoteEmail({
          to: created.client.email,
          clientName: `${created.client.first_name} ${created.client.last_name}`.trim(),
          number: created.quote.number,
          validUntil: created.quote.valid_until,
          message,
          pdfBase64: Buffer.from(bytes).toString("base64"),
        });
        emailed = true;
        await query("UPDATE quotes SET sent_to = $1, sent_at = now() WHERE id = $2", [created.client.email, created.quote.id]);
      } catch (e) {
        console.error(e);
        emailError = e.message || "Envoi impossible.";
      }
    }
    return NextResponse.json({ ok: true, quote: { id: created.quote.id, number: created.quote.number }, emailed, emailError });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Création du devis impossible, réessaie dans un instant." }, { status: 500 });
  }
}
