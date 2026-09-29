import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  const { name, species, breed, notes, sterilized, identified, ageInfo, diet, healthConditions } = await req.json();
  if (!name) return NextResponse.json({ error: "Le nom de l'animal est requis." }, { status: 400 });
  const { rows } = await query(
    `INSERT INTO pets (client_id, name, species, breed, notes, sterilized, identified, age_info, diet, health_conditions)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [id, name, species || "", breed || "", notes || "", sterilized === true, identified === true, ageInfo || "", diet || "", healthConditions || ""]
  );
  return NextResponse.json({ pet: rows[0] });
}
