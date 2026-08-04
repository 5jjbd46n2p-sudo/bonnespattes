import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  const { name, species, breed, notes } = await req.json();
  if (!name) return NextResponse.json({ error: "Le nom de l'animal est requis." }, { status: 400 });
  const { rows } = await query(
    `INSERT INTO pets (client_id, name, species, breed, notes) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [id, name, species || "", breed || "", notes || ""]
  );
  return NextResponse.json({ pet: rows[0] });
}
