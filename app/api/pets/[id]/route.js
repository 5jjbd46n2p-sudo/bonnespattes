import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  const { name, species, breed, notes } = body;
  for (const v of [name, species, breed, notes]) {
    if (v !== undefined && v !== null && typeof v !== "string") {
      return NextResponse.json({ error: "Valeur invalide." }, { status: 400 });
    }
  }
  if (name !== undefined && name !== null && !name.trim()) {
    return NextResponse.json({ error: "Le nom de l'animal est requis." }, { status: 400 });
  }
  const { rows } = await query(
    `UPDATE pets SET name = COALESCE($1,name), species = COALESCE($2,species),
     breed = COALESCE($3,breed), notes = COALESCE($4,notes) WHERE id = $5 RETURNING *`,
    [name?.trim(), species?.trim(), breed?.trim(), notes, id]
  );
  if (!rows[0]) return NextResponse.json({ error: "Animal introuvable." }, { status: 404 });
  return NextResponse.json({ pet: rows[0] });
}

export async function DELETE(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  await query("DELETE FROM pets WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
