import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { query, tx } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { generateWeeklyRecurrenceDates } from "@/lib/utils";

export async function GET(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const clientId = searchParams.get("clientId");
  const unbilled = searchParams.get("unbilled");

  const conditions = [];
  const values = [];
  let i = 1;

  if (date) {
    conditions.push(`v.date = $${i++}`);
    values.push(date);
  }
  if (from) {
    conditions.push(`v.date >= $${i++}`);
    values.push(from);
  }
  if (to) {
    conditions.push(`v.date <= $${i++}`);
    values.push(to);
  }
  if (clientId) {
    conditions.push(`v.client_id = $${i++}`);
    values.push(clientId);
  }
  if (unbilled === "1") {
    conditions.push(`v.invoice_id IS NULL AND v.status = 'FAIT'`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const { rows } = await query(
    `SELECT v.*, p.name AS pet_name, c.first_name, c.last_name, c.address,
      (SELECT COUNT(*) FROM photos ph WHERE ph.visit_id = v.id) AS photo_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.visit_id = v.id) AS task_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.visit_id = v.id AND t.done) AS task_done_count
     FROM visits v
     JOIN pets p ON p.id = v.pet_id
     JOIN clients c ON c.id = v.client_id
     ${where}
     ORDER BY v.date ASC, v.start_time ASC NULLS LAST`,
    values
  );
  return NextResponse.json({ visits: rows });
}

export async function POST(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const body = await req.json();
  const { petId, clientId, date, startTime, endTime, notes, price, tasks = [], recurrence, travelFee } = body;
  const fee = travelFee === undefined || travelFee === null || travelFee === "" ? 0 : Number(travelFee);
  if (!Number.isFinite(fee) || fee < 0) {
    return NextResponse.json({ error: "Frais de déplacement invalides." }, { status: 400 });
  }
  if (!petId || !clientId || !date) {
    return NextResponse.json({ error: "Animal, client et date requis." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }
  // L'animal doit bien appartenir au client choisi (cohérence des données).
  const petCheck = await query("SELECT 1 FROM pets WHERE id = $1 AND client_id = $2", [petId, clientId]);
  if (petCheck.rows.length === 0) {
    return NextResponse.json({ error: "Cet animal n'appartient pas à ce client." }, { status: 400 });
  }

  // Récurrence "semaine type" : l'utilisateur choisit les jours de la semaine
  // (ex. lundi/mercredi/vendredi) et un nombre de semaines, plutôt que de créer
  // chaque visite une par une.
  let visitDates = [date];
  if (recurrence && Array.isArray(recurrence.weekdays) && recurrence.weekdays.length > 0) {
    const weeks = Math.min(Math.max(Math.floor(Number(recurrence.weeks) || 1), 1), 26);
    const generated = generateWeeklyRecurrenceDates(date, recurrence.weekdays, weeks).slice(0, 180);
    if (generated.length > 0) visitDates = generated;
  }
  const recurrenceId = visitDates.length > 1 ? randomUUID() : null;

  const visits = await tx(async (client) => {
    const created = [];
    for (const visitDate of visitDates) {
      const visitRes = await client.query(
        `INSERT INTO visits (pet_id, client_id, date, start_time, end_time, notes, price, recurrence_id, travel_fee)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [petId, clientId, visitDate, startTime || null, endTime || null, notes || "", price || 0, recurrenceId, fee]
      );
      const visit = visitRes.rows[0];
      let position = 0;
      for (const label of tasks) {
        if (!label || !label.trim()) continue;
        await client.query(
          `INSERT INTO tasks (visit_id, label, position) VALUES ($1,$2,$3)`,
          [visit.id, label.trim(), position++]
        );
      }
      created.push(visit);
    }
    return created;
  });

  return NextResponse.json({ visit: visits[0], visits, count: visits.length });
}
