import { NextResponse } from "next/server";
import { tx } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

function durationLabel(min) {
  if (!min || min <= 0) return "";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

export async function POST(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const { clientId, visitIds, tvaRate, dueDate } = body || {};
  if (!clientId || !Array.isArray(visitIds) || visitIds.length === 0) {
    return NextResponse.json({ error: "Client et au moins une visite requis." }, { status: 400 });
  }
  const ids = [...new Set(visitIds)];

  try {
    const invoice = await tx(async (client) => {
      const settings = (await client.query("SELECT * FROM settings LIMIT 1 FOR UPDATE")).rows[0];
      const visitsRes = await client.query(
        `SELECT v.id, v.client_id, v.status, v.invoice_id, v.price, v.travel_fee, v.is_free,
                to_char(v.date, 'DD/MM/YYYY') AS date_fr, p.name AS pet_name,
                CASE WHEN v.start_time IS NOT NULL AND v.end_time IS NOT NULL
                     THEN EXTRACT(EPOCH FROM (v.end_time - v.start_time)) / 60 END AS minutes
         FROM visits v JOIN pets p ON p.id = v.pet_id
         WHERE v.id = ANY($1::uuid[]) ORDER BY v.date, v.start_time NULLS LAST FOR UPDATE OF v`,
        [ids]
      );
      const visits = visitsRes.rows;
      if (visits.length !== ids.length) {
        const e = new Error("Une des visites est introuvable.");
        e.status = 404;
        throw e;
      }
      if (visits.some((v) => v.client_id !== clientId)) {
        const e = new Error("Toutes les visites doivent appartenir au même client.");
        e.status = 400;
        throw e;
      }
      if (visits.some((v) => v.invoice_id)) {
        const e = new Error("Une des visites est déjà facturée.");
        e.status = 409;
        throw e;
      }
      if (visits.some((v) => v.status !== "FAIT")) {
        const e = new Error("Seules les visites terminées peuvent être facturées.");
        e.status = 400;
        throw e;
      }

      const items = [];
      for (const v of visits) {
        const dur = durationLabel(Number(v.minutes));
        const label = `Visite du ${v.date_fr} — ${v.pet_name}${dur ? ` (${dur})` : ""}`;
        if (v.is_free) {
          items.push({ description: `${label} — offerte`, unitPrice: 0 });
          continue;
        }
        items.push({ description: label, unitPrice: Number(v.price) || 0 });
        if (Number(v.travel_fee) > 0) {
          items.push({ description: `Déplacement — visite du ${v.date_fr}`, unitPrice: Number(v.travel_fee) });
        }
      }

      const tva = tvaRate !== undefined && tvaRate !== null && tvaRate !== "" ? Number(tvaRate) : Number(settings.default_tva_rate) || 0;
      if (!Number.isFinite(tva) || tva < 0) {
        const e = new Error("Taux de TVA invalide.");
        e.status = 400;
        throw e;
      }

      const seq = settings.next_invoice_seq;
      const number = `${settings.invoice_prefix}${String(seq).padStart(4, "0")}`;
      await client.query("UPDATE settings SET next_invoice_seq = next_invoice_seq + 1 WHERE id = $1", [settings.id]);

      const totalHT = items.reduce((sum, it) => sum + it.unitPrice, 0);
      const totalTVA = totalHT * (tva / 100);
      const totalTTC = totalHT + totalTVA;

      const invRes = await client.query(
        `INSERT INTO invoices (client_id, number, due_date, tva_rate, total_ht, total_tva, total_ttc, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [clientId, number, dueDate || null, tva, totalHT, totalTVA, totalTTC, ""]
      );
      const inv = invRes.rows[0];
      for (const it of items) {
        await client.query(
          `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) VALUES ($1,$2,1,$3,$3)`,
          [inv.id, it.description, it.unitPrice]
        );
      }
      await client.query(`UPDATE visits SET invoice_id = $1 WHERE id = ANY($2::uuid[])`, [inv.id, ids]);
      return inv;
    });
    return NextResponse.json({ invoice });
  } catch (e) {
    if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur, réessaie plus tard." }, { status: 500 });
  }
}
