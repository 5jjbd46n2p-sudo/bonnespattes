import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parseDateISO, readJson } from "@/lib/api";
import { parseEventFields } from "@/lib/adminEventFields";
import { generateWeeklyRecurrenceDates } from "@/lib/utils";

export async function POST(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const b = await readJson(req);
  const date = parseDateISO(b.date);
  if (!date) return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  const parsed = await parseEventFields(b);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const f = parsed.fields;

  // Récurrence « semaine type », comme pour les visites.
  let dates = [date];
  const rec = b.recurrence;
  if (rec && Array.isArray(rec.weekdays) && rec.weekdays.length > 0) {
    const weekdays = rec.weekdays.map(Number).filter((d) => Number.isInteger(d) && d >= 1 && d <= 7);
    const weeks = Math.min(Math.max(Math.floor(Number(rec.weeks) || 1), 1), 26);
    const generated = generateWeeklyRecurrenceDates(date, weekdays, weeks).slice(0, 180);
    if (generated.length > 0) dates = generated;
  }
  const recurrenceId = dates.length > 1 ? randomUUID() : null;

  const { rows } = await query(
    `INSERT INTO admin_events (date, start_time, end_time, kind, title, client_id, place, travel_km, travel_minutes, notes, recurrence_id)
     SELECT d::date, $2,$3,$4,$5,$6,$7,$8,$9,$10,$11 FROM unnest($1::text[]) AS d RETURNING id`,
    [dates, f.start, f.end, f.kind, f.title, f.clientId, f.place, f.km, f.min, f.notes, recurrenceId]
  );
  return NextResponse.json({ count: rows.length }, { status: 201 });
}
