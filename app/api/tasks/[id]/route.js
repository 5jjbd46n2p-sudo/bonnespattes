import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  const { done, label } = await req.json();
  const sets = [];
  const values = [];
  let i = 1;
  if (done !== undefined) {
    sets.push(`done = $${i++}`);
    values.push(done);
  }
  if (label !== undefined) {
    sets.push(`label = $${i++}`);
    values.push(label);
  }
  if (!sets.length) return NextResponse.json({ error: "Rien à mettre à jour." }, { status: 400 });
  values.push(id);
  const { rows } = await query(`UPDATE tasks SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`, values);
  return NextResponse.json({ task: rows[0] });
}

export async function DELETE(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  await query("DELETE FROM tasks WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
