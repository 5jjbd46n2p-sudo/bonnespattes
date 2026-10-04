import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { cleanText, isUuid, parseDateISO, readJson } from "@/lib/api";
import { ADMIN_EVENT_KIND_IDS } from "@/lib/adminEvents";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function POST(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const b = await readJson(req);
  const date = parseDateISO(b.date);
  const title = cleanText(b.title, 120);
  const kind = ADMIN_EVENT_KIND_IDS.includes(b.kind) ? b.kind : "AUTRE";
  const start = b.startTime || null;
  const end = b.endTime || null;
  if (!date) return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  if (!title) return NextResponse.json({ error: "Donne un titre." }, { status: 400 });
  if ((start && !TIME_RE.test(start)) || (end && !TIME_RE.test(end))) {
    return NextResponse.json({ error: "Horaire invalide." }, { status: 400 });
  }
  const km = b.travelKm === "" || b.travelKm == null ? 0 : Number(b.travelKm);
  const min = b.travelMinutes === "" || b.travelMinutes == null ? 0 : Math.round(Number(b.travelMinutes));
  if (!Number.isFinite(km) || km < 0 || km > 2000 || !Number.isFinite(min) || min < 0 || min > 1440) {
    return NextResponse.json({ error: "Trajet invalide." }, { status: 400 });
  }
  let clientId = null;
  if (b.clientId) {
    if (!isUuid(b.clientId)) return NextResponse.json({ error: "Client invalide." }, { status: 400 });
    const c = await query("SELECT 1 FROM clients WHERE id = $1", [b.clientId]);
    if (!c.rows[0]) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
    clientId = b.clientId;
  }
  const { rows } = await query(
    `INSERT INTO admin_events (date, start_time, end_time, kind, title, client_id, place, travel_km, travel_minutes, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [date, start, end, kind, title, clientId, cleanText(b.place, 200), Math.round(km * 10) / 10, min, cleanText(b.notes, 1000)]
  );
  return NextResponse.json({ event: rows[0] }, { status: 201 });
}
