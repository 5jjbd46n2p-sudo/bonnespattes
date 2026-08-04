import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { query, tx } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { addDaysISO } from "@/lib/utils";

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
  const { petId, clientId, date, startTime, endTime, notes, price, tasks = [], recurrence } = body;
  if (!petId || !clientId || !date) {
    return NextResponse.json({ error: "Animal, client et date requis." }, { status: 400 });
  }

  // Récurrence : planifie en une fois plusieurs occurrences (ex. tous les jours
  // pendant 7 visites) au lieu de créer la visite manuellement à chaque fois.
  const occurrences =
    recurrence && Number(recurrence.occurrences) > 1
      ? Math.min(Math.floor(Number(recurrence.occurrences)), 60)
      : 1;
  const stepDays = recurrence?.frequency === "weekly" ? 7 : 1;
  const recurrenceId = occurrences > 1 ? randomUUID() : null;

  const visits = await tx(async (client) => {
    const created = [];
    for (let n = 0; n < occurrences; n++) {
      const visitDate = n === 0 ? date : addDaysISO(date, n * stepDays);
      const visitRes = await client.query(
        `INSERT INTO visits (pet_id, client_id, date, start_time, end_time, notes, price, recurrence_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [petId, clientId, visitDate, startTime || null, endTime || null, notes || "", price || 0, recurrenceId]
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
