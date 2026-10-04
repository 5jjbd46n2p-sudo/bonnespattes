import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isUuid, parseDateISO, readJson } from "@/lib/api";
import { parseEventFields } from "@/lib/adminEventFields";

export async function PATCH(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const b = await readJson(req);

  // Simple case à cocher
  if (typeof b.done === "boolean" && b.title === undefined) {
    const { rowCount } = await query("UPDATE admin_events SET done = $1 WHERE id = $2", [b.done, id]);
    if (!rowCount) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  // Modification complète (libellé, description, horaires, trajet…)
  const parsed = await parseEventFields(b);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const f = parsed.fields;
  const cur = await query("SELECT date::text AS date, recurrence_id FROM admin_events WHERE id = $1", [id]);
  const row = cur.rows[0];
  if (!row) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const newDate = b.date ? parseDateISO(b.date) : row.date;
  if (!newDate) return NextResponse.json({ error: "Date invalide." }, { status: 400 });

  const vals = [f.kind, f.title, f.clientId, f.place, f.km, f.min, f.notes, f.start, f.end];
  if (b.scope === "following" && row.recurrence_id) {
    // Cet événement et les suivants de la série : tout change sauf les dates
    // (seul l'événement en cours peut être déplacé).
    await query(
      `UPDATE admin_events SET kind=$1, title=$2, client_id=$3, place=$4, travel_km=$5, travel_minutes=$6, notes=$7, start_time=$8, end_time=$9
       WHERE recurrence_id = $10 AND date >= $11::date`,
      [...vals, row.recurrence_id, row.date]
    );
    if (newDate !== row.date) await query("UPDATE admin_events SET date = $1 WHERE id = $2", [newDate, id]);
  } else {
    await query(
      `UPDATE admin_events SET kind=$1, title=$2, client_id=$3, place=$4, travel_km=$5, travel_minutes=$6, notes=$7, start_time=$8, end_time=$9, date=$10
       WHERE id = $11`,
      [...vals, newDate, id]
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const following = new URL(req.url).searchParams.get("scope") === "following";
  const { rowCount } = following
    ? await query(
        `DELETE FROM admin_events WHERE id = $1 OR (recurrence_id IS NOT NULL AND recurrence_id = (SELECT recurrence_id FROM admin_events WHERE id = $1)
          AND date >= (SELECT date FROM admin_events WHERE id = $1))`,
        [id]
      )
    : await query("DELETE FROM admin_events WHERE id = $1", [id]);
  if (!rowCount) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
