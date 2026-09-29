import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin, getCurrentUser } from "@/lib/auth";

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;

  const visitRes = await query(
    `SELECT v.*, p.name AS pet_name, p.species, p.breed, c.first_name, c.last_name, c.address
     FROM visits v JOIN pets p ON p.id = v.pet_id JOIN clients c ON c.id = v.client_id
     WHERE v.id = $1`,
    [id]
  );
  const visit = visitRes.rows[0];
  if (!visit) return NextResponse.json({ error: "Visite introuvable." }, { status: 404 });

  // Un client ne peut voir que ses propres visites
  if (user.role === "CLIENT" && visit.client_id !== user.client_id) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  const tasksRes = await query(
    "SELECT * FROM tasks WHERE visit_id = $1 ORDER BY position, label",
    [id]
  );
  const photosRes = await query(
    "SELECT * FROM photos WHERE visit_id = $1 ORDER BY created_at DESC",
    [id]
  );

  return NextResponse.json({ visit, tasks: tasksRes.rows, photos: photosRes.rows });
}

export async function PATCH(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const map = {
    status: "status",
    notes: "notes",
    price: "price",
    date: "date",
    startTime: "start_time",
    endTime: "end_time",
    isFree: "is_free",
    freeReason: "free_reason",
    travelFee: "travel_fee",
  };
  for (const key of ["price", "travelFee"]) {
    if (body[key] !== undefined) {
      const n = Number(body[key]);
      if (body[key] === "" || body[key] === null || !Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: "Montant invalide (nombre positif attendu)." }, { status: 400 });
      }
      body[key] = n;
    }
  }
  if (body.isFree !== undefined) body.isFree = Boolean(body.isFree);
  if (body.freeReason !== undefined) body.freeReason = String(body.freeReason ?? "").slice(0, 300);
  const sets = [];
  const values = [];
  let i = 1;
  for (const [key, col] of Object.entries(map)) {
    if (body[key] !== undefined) {
      sets.push(`${col} = $${i++}`);
      values.push(body[key]);
    }
  }
  if (sets.length === 0) return NextResponse.json({ error: "Rien à mettre à jour." }, { status: 400 });
  values.push(id);
  const { rows } = await query(
    `UPDATE visits SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
    values
  );
  return NextResponse.json({ visit: rows[0] });
}

export async function DELETE(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  const { searchParams } = new URL(req.url);

  // Si la visite fait partie d'une série récurrente et que la suppression de
  // la série a été demandée, on supprime aussi les occurrences futures encore
  // planifiées (on ne touche jamais à celles déjà faites/annulées).
  if (searchParams.get("series") === "1") {
    const current = await query("SELECT recurrence_id, date FROM visits WHERE id = $1", [id]);
    const v = current.rows[0];
    if (v?.recurrence_id) {
      await query(
        "DELETE FROM visits WHERE recurrence_id = $1 AND date >= $2 AND status = 'PLANIFIE'",
        [v.recurrence_id, v.date]
      );
      return NextResponse.json({ ok: true });
    }
  }

  await query("DELETE FROM visits WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
