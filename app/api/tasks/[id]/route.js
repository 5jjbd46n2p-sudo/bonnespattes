import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { cleanText, isUuid, readJson } from "@/lib/api";

export async function PATCH(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const { done, label } = await readJson(req);
  const sets = [];
  const values = [];
  let i = 1;
  if (done !== undefined) {
    if (typeof done !== "boolean") return NextResponse.json({ error: "Valeur invalide." }, { status: 400 });
    sets.push(`done = $${i++}`);
    values.push(done);
  }
  if (label !== undefined) {
    const text = cleanText(label, 200);
    if (!text) return NextResponse.json({ error: "Libellé requis." }, { status: 400 });
    sets.push(`label = $${i++}`);
    values.push(text);
  }
  if (!sets.length) return NextResponse.json({ error: "Rien à mettre à jour." }, { status: 400 });
  values.push(id);
  const { rows } = await query(`UPDATE tasks SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`, values);
  if (!rows[0]) return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });
  return NextResponse.json({ task: rows[0] });
}

export async function DELETE(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  await query("DELETE FROM tasks WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
