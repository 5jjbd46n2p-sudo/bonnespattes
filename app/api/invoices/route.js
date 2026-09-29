import { NextResponse } from "next/server";
import { query, tx } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { allocateInvoiceNumber } from "@/lib/invoiceNumber";
import { cleanText, isUuid, parseDateISO, readJson } from "@/lib/api";

const STATUSES = ["BROUILLON", "ENVOYEE", "PAYEE", "EN_RETARD"];
const cents = (n) => Math.round(n * 100) / 100;

export async function GET(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const clientId = searchParams.get("clientId");
  if ((status && !STATUSES.includes(status)) || (clientId && !isUuid(clientId))) {
    return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
  }

  const conditions = [];
  const values = [];
  let i = 1;
  if (status) {
    conditions.push(`i.status = $${i++}`);
    values.push(status);
  }
  if (clientId) {
    conditions.push(`i.client_id = $${i++}`);
    values.push(clientId);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const { rows } = await query(
    `SELECT i.*, c.first_name, c.last_name,
      (SELECT COALESCE(SUM(amount),0) FROM payments pay WHERE pay.invoice_id = i.id) AS paid_amount
     FROM invoices i JOIN clients c ON c.id = i.client_id
     ${where}
     ORDER BY i.issue_date DESC, i.created_at DESC`,
    values
  );
  return NextResponse.json({ invoices: rows });
}

export async function POST(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const body = await readJson(req);
  const { clientId, isTest = false } = body;
  const bad = (error) => NextResponse.json({ error }, { status: 400 });
  const rawItems = Array.isArray(body.items) ? body.items : [];
  const visitIds = Array.isArray(body.visitIds) ? [...new Set(body.visitIds)] : [];
  const depositIds = Array.isArray(body.depositIds) ? [...new Set(body.depositIds)] : [];
  const tvaRate = body.tvaRate === undefined || body.tvaRate === "" ? 0 : Number(body.tvaRate);
  const dueDate = body.dueDate ? parseDateISO(body.dueDate) : null;
  const notes = cleanText(body.notes, 2000);

  if (!isUuid(clientId) || rawItems.length === 0 || rawItems.length > 200) {
    return bad("Client et au moins une ligne requis.");
  }
  if (!Number.isFinite(tvaRate) || tvaRate < 0 || tvaRate > 100) return bad("Taux de TVA invalide.");
  if (body.dueDate && !dueDate) return bad("Date d'échéance invalide.");
  if (![...visitIds, ...depositIds].every(isUuid)) return bad("Sélection invalide.");
  // Chaque ligne : libellé, quantité et prix unitaire valides, total arrondi au centime
  const items = [];
  for (const it of rawItems) {
    const description = cleanText(it?.description, 300);
    const quantity = Number(it?.quantity);
    const unitPrice = Number(it?.unitPrice);
    if (!description || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      return bad("Chaque ligne doit avoir un libellé, une quantité et un prix valides.");
    }
    items.push({ description, quantity, unitPrice: cents(unitPrice), total: cents(quantity * unitPrice) });
  }

  try {
    const result = await tx(async (client) => {
      const settingsRes = await client.query("SELECT * FROM settings LIMIT 1 FOR UPDATE");
      const settings = settingsRes.rows[0];
      const number = await allocateInvoiceNumber(client, settings, isTest === true);

      const totalHT = cents(items.reduce((sum, it) => sum + it.total, 0));
      const totalTVA = cents(totalHT * (tvaRate / 100));
      const totalTTC = cents(totalHT + totalTVA);

      const invRes = await client.query(
        `INSERT INTO invoices (client_id, number, due_date, tva_rate, total_ht, total_tva, total_ttc, notes, is_test)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [clientId, number, dueDate, tvaRate, totalHT, totalTVA, totalTTC, notes, isTest === true]
      );
      const invoice = invRes.rows[0];

      // Lignes insérées en une seule requête
      await client.query(
        `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total)
         SELECT $1, d, q, u, t FROM unnest($2::text[], $3::numeric[], $4::numeric[], $5::numeric[]) AS x(d, q, u, t)`,
        [invoice.id, items.map((i) => i.description), items.map((i) => i.quantity), items.map((i) => i.unitPrice), items.map((i) => i.total)]
      );

      // Seules des visites de CE client, pas encore facturées, peuvent être rattachées.
      if (visitIds.length) {
        const upd = await client.query(
          `UPDATE visits SET invoice_id = $1
            WHERE id = ANY($2::uuid[]) AND client_id = $3 AND invoice_id IS NULL`,
          [invoice.id, visitIds, clientId]
        );
        if (upd.rowCount !== visitIds.length) {
          const e = new Error("Une des visites n'appartient pas à ce client ou est déjà facturée.");
          e.status = 409;
          throw e;
        }
      }

      // Applique les acomptes sélectionnés : on les marque comme utilisés et on
      // crée un paiement correspondant sur la nouvelle facture, pour que le
      // solde restant dû (et le statut "Payée") se mettent à jour automatiquement.
      let depositsTotal = 0;
      if (depositIds.length) {
        const depRes = await client.query(
          `SELECT * FROM deposits WHERE id = ANY($1::uuid[]) AND client_id = $2 AND invoice_id IS NULL FOR UPDATE`,
          [depositIds, clientId]
        );
        for (const dep of depRes.rows) {
          await client.query(`UPDATE deposits SET invoice_id = $1 WHERE id = $2`, [invoice.id, dep.id]);
          await client.query(
            `INSERT INTO payments (invoice_id, amount, date, method) VALUES ($1,$2,$3,$4)`,
            [invoice.id, dep.amount, dep.date, dep.method ? `Acompte (${dep.method})` : "Acompte"]
          );
          depositsTotal += Number(dep.amount);
        }
      }

      if (depositsTotal > 0 && depositsTotal >= totalTTC) {
        await client.query(`UPDATE invoices SET status = 'PAYEE' WHERE id = $1`, [invoice.id]);
        invoice.status = "PAYEE";
      }

      return invoice;
    });

    return NextResponse.json({ invoice: result });
  } catch (e) {
    if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur, réessaie plus tard." }, { status: 500 });
  }
}
