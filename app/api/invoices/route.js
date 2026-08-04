import { NextResponse } from "next/server";
import { query, tx } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const clientId = searchParams.get("clientId");

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

  const body = await req.json();
  const { clientId, items = [], tvaRate = 0, dueDate, notes, visitIds = [], depositIds = [] } = body;

  if (!clientId || items.length === 0) {
    return NextResponse.json({ error: "Client et au moins une ligne requis." }, { status: 400 });
  }

  try {
    const result = await tx(async (client) => {
      const settingsRes = await client.query("SELECT * FROM settings LIMIT 1");
      const settings = settingsRes.rows[0];
      const seq = settings.next_invoice_seq;
      const number = `${settings.invoice_prefix}${String(seq).padStart(4, "0")}`;
      await client.query("UPDATE settings SET next_invoice_seq = next_invoice_seq + 1 WHERE id = $1", [
        settings.id,
      ]);

      const totalHT = items.reduce((sum, it) => sum + Number(it.quantity) * Number(it.unitPrice), 0);
      const totalTVA = totalHT * (Number(tvaRate) / 100);
      const totalTTC = totalHT + totalTVA;

      const invRes = await client.query(
        `INSERT INTO invoices (client_id, number, due_date, tva_rate, total_ht, total_tva, total_ttc, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [clientId, number, dueDate || null, tvaRate, totalHT, totalTVA, totalTTC, notes || ""]
      );
      const invoice = invRes.rows[0];

      for (const it of items) {
        const total = Number(it.quantity) * Number(it.unitPrice);
        await client.query(
          `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total)
           VALUES ($1,$2,$3,$4,$5)`,
          [invoice.id, it.description, it.quantity, it.unitPrice, total]
        );
      }

      if (visitIds.length) {
        await client.query(
          `UPDATE visits SET invoice_id = $1 WHERE id = ANY($2::uuid[])`,
          [invoice.id, visitIds]
        );
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
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur : " + e.message }, { status: 500 });
  }
}
