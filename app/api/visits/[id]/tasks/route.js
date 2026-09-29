import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { cleanText, isUuid, readJson } from "@/lib/api";

export async function POST(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const label = cleanText((await readJson(req)).label, 200);
  if (!label) return NextResponse.json({ error: "Libellé requis." }, { status: 400 });
  // Une seule requête : position calculée à l'insertion, visite vérifiée au passage
  const { rows } = await query(
    `INSERT INTO tasks (visit_id, label, position)
     SELECT v.id, $2, COALESCE((SELECT MAX(position) + 1 FROM tasks WHERE visit_id = v.id), 0)
       FROM visits v WHERE v.id = $1
     RETURNING *`,
    [id, label]
  );
  if (!rows[0]) return NextResponse.json({ error: "Visite introuvable." }, { status: 404 });
  return NextResponse.json({ task: rows[0] });
}
