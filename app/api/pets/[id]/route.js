import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  const { name, species, breed, notes } = await req.json();
  const { rows } = await query(
    `UPDATE pets SET name = COALESCE($1,name), species = COALESCE($2,species),
     breed = COALESCE($3,breed), notes = COALESCE($4,notes) WHERE id = $5 RETURNING *`,
    [name, species, breed, notes, id]
  );
  return NextResponse.json({ pet: rows[0] });
}

export async function DELETE(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  await query("DELETE FROM pets WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
