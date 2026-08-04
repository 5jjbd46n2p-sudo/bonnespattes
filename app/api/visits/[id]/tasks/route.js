import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  const { label } = await req.json();
  if (!label || !label.trim()) return NextResponse.json({ error: "Libellé requis." }, { status: 400 });
  const posRes = await query(
    "SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM tasks WHERE visit_id = $1",
    [id]
  );
  const { rows } = await query(
    "INSERT INTO tasks (visit_id, label, position) VALUES ($1,$2,$3) RETURNING *",
    [id, label.trim(), posRes.rows[0].next_pos]
  );
  return NextResponse.json({ task: rows[0] });
}
