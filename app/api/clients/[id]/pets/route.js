import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { cleanText, isUuid, readJson } from "@/lib/api";

export async function POST(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const body = await readJson(req);
  const name = cleanText(body.name, 100);
  if (!name) return NextResponse.json({ error: "Le nom de l'animal est requis." }, { status: 400 });
  const { sterilized, identified, identificationNumber } = body;
  const idNum = typeof identificationNumber === "string" ? identificationNumber.trim() : "";
  if (!/^[A-Za-z0-9 .-]{0,30}$/.test(idNum)) {
    return NextResponse.json({ error: "Numéro de puce ou de tatouage invalide (chiffres, lettres, tirets ; 30 caractères maximum)." }, { status: 400 });
  }
  const { rows } = await query(
    `INSERT INTO pets (client_id, name, species, breed, notes, sterilized, identified, age_info, diet, health_conditions, identification_number)
     SELECT id, $2,$3,$4,$5,$6,$7,$8,$9,$10,$11 FROM clients WHERE id = $1 AND anonymized_at IS NULL RETURNING *`,
    [id, name, cleanText(body.species, 100), cleanText(body.breed, 100), cleanText(body.notes, 2000),
     sterilized === true, identified === true || idNum !== "", cleanText(body.ageInfo, 100),
     cleanText(body.diet, 1000), cleanText(body.healthConditions, 2000), idNum]
  );
  if (!rows[0]) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  return NextResponse.json({ pet: rows[0] });
}
