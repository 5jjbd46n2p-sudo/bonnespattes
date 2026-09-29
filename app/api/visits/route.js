import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { query, tx } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { generateWeeklyRecurrenceDates } from "@/lib/utils";
import { isUuid, readJson } from "@/lib/api";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export async function GET(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const clientId = searchParams.get("clientId");
  const unbilled = searchParams.get("unbilled");
  if ([date, from, to].some((d) => d && !DATE_RE.test(d)) || (clientId && !isUuid(clientId))) {
    return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
  }

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

const bad = (error) => NextResponse.json({ error }, { status: 400 });

export async function POST(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const body = await readJson(req);
  const { petId, clientId, date, recurrence } = body;
  const startTime = body.startTime || null;
  const endTime = body.endTime || null;
  const notes = typeof body.notes === "string" ? body.notes.slice(0, 2000) : "";
  const price = body.price === undefined || body.price === null || body.price === "" ? 0 : Number(body.price);
  const fee = body.travelFee === undefined || body.travelFee === null || body.travelFee === "" ? 0 : Number(body.travelFee);
  const tasks = (Array.isArray(body.tasks) ? body.tasks : [])
    .filter((t) => typeof t === "string" && t.trim())
    .map((t) => t.trim().slice(0, 200))
    .slice(0, 30);

  if (!isUuid(petId) || !isUuid(clientId) || !date) return bad("Animal, client et date requis.");
  if (!DATE_RE.test(date)) return bad("Date invalide.");
  if ((startTime && !TIME_RE.test(startTime)) || (endTime && !TIME_RE.test(endTime))) return bad("Horaire invalide.");
  if (!Number.isFinite(price) || price < 0) return bad("Prix invalide.");
  if (!Number.isFinite(fee) || fee < 0) return bad("Frais de déplacement invalides.");

  // L'animal doit bien appartenir au client choisi (cohérence des données).
  const petCheck = await query("SELECT 1 FROM pets WHERE id = $1 AND client_id = $2", [petId, clientId]);
  if (petCheck.rows.length === 0) return bad("Cet animal n'appartient pas à ce client.");

  // Récurrence "semaine type" : l'utilisateur choisit les jours de la semaine
  // (ex. lundi/mercredi/vendredi) et un nombre de semaines, plutôt que de créer
  // chaque visite une par une.
  let visitDates = [date];
  if (recurrence && Array.isArray(recurrence.weekdays) && recurrence.weekdays.length > 0) {
    const weekdays = recurrence.weekdays.map(Number).filter((d) => Number.isInteger(d) && d >= 1 && d <= 7);
    const weeks = Math.min(Math.max(Math.floor(Number(recurrence.weeks) || 1), 1), 26);
    const generated = generateWeeklyRecurrenceDates(date, weekdays, weeks).slice(0, 180);
    if (generated.length > 0) visitDates = generated;
  }
  const recurrenceId = visitDates.length > 1 ? randomUUID() : null;

  // Insertion groupée : 2 requêtes quel que soit le nombre de visites et de
  // tâches (au lieu d'une requête par visite et par tâche).
  const visits = await tx(async (db) => {
    const { rows: created } = await db.query(
      `INSERT INTO visits (pet_id, client_id, date, start_time, end_time, notes, price, recurrence_id, travel_fee)
       SELECT $1, $2, d::date, $4, $5, $6, $7, $8, $9 FROM unnest($3::text[]) AS d
       RETURNING *`,
      [petId, clientId, visitDates, startTime, endTime, notes, price, recurrenceId, fee]
    );
    if (tasks.length) {
      await db.query(
        `INSERT INTO tasks (visit_id, label, position)
         SELECT v.id, t.label, t.pos - 1
           FROM unnest($1::uuid[]) AS v(id)
           CROSS JOIN unnest($2::text[]) WITH ORDINALITY AS t(label, pos)`,
        [created.map((v) => v.id), tasks]
      );
    }
    return created.sort((a, b) => new Date(a.date) - new Date(b.date));
  });

  return NextResponse.json({ visit: visits[0], visits, count: visits.length });
}
