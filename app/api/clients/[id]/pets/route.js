import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  const { name, species, breed, notes, sterilized, identified, ageInfo, diet, healthConditions, identificationNumber } = await req.json();
  if (!name) return NextResponse.json({ error: "Le nom de l'animal est requis." }, { status: 400 });
  const idNum = typeof identificationNumber === "string" ? identificationNumber.trim() : "";
  if (!/^[A-Za-z0-9 .-]{0,30}$/.test(idNum)) {
    return NextResponse.json({ error: "Numéro de puce ou de tatouage invalide (chiffres, lettres, tirets ; 30 caractères maximum)." }, { status: 400 });
  }
  const { rows } = await query(
    `INSERT INTO pets (client_id, name, species, breed, notes, sterilized, identified, age_info, diet, health_conditions, identification_number)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [id, name, species || "", breed || "", notes || "", sterilized === true, identified === true || idNum !== "", ageInfo || "", diet || "", healthConditions || "", idNum]
  );
  return NextResponse.json({ pet: rows[0] });
}
