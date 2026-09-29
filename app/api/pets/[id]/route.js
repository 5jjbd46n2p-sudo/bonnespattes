import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deleteBlobs, visitPhotoUrls } from "@/lib/privacy";
import { isUuid, readJson } from "@/lib/api";

export async function PATCH(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const body = await readJson(req);
  const { name, species, breed, notes, sterilized, identified, ageInfo, diet, healthConditions, identificationNumber } = body;
  for (const v of [name, species, breed, notes, ageInfo, diet, healthConditions, identificationNumber]) {
    if (v !== undefined && v !== null && typeof v !== "string") {
      return NextResponse.json({ error: "Valeur invalide." }, { status: 400 });
    }
  }
  if (name !== undefined && name !== null && !name.trim()) {
    return NextResponse.json({ error: "Le nom de l'animal est requis." }, { status: 400 });
  }
  for (const v of [sterilized, identified]) {
    if (v !== undefined && v !== null && typeof v !== "boolean") {
      return NextResponse.json({ error: "Valeur invalide." }, { status: 400 });
    }
  }
  const idNum = typeof identificationNumber === "string" ? identificationNumber.trim() : identificationNumber;
  if (typeof idNum === "string" && !/^[A-Za-z0-9 .-]{0,30}$/.test(idNum)) {
    return NextResponse.json({ error: "Numéro de puce ou de tatouage invalide (chiffres, lettres, tirets ; 30 caractères maximum)." }, { status: 400 });
  }
  const { rows } = await query(
    `UPDATE pets SET name = COALESCE($1,name), species = COALESCE($2,species),
     breed = COALESCE($3,breed), notes = COALESCE($4,notes),
     sterilized = COALESCE($5,sterilized), identified = COALESCE($6,identified) OR (COALESCE($11,'') <> ''),
     age_info = COALESCE($7,age_info), diet = COALESCE($8,diet), health_conditions = COALESCE($9,health_conditions),
     identification_number = COALESCE($11,identification_number)
     WHERE id = $10 RETURNING *`,
    [name?.trim(), species?.trim(), breed?.trim(), notes, sterilized, identified, ageInfo, diet, healthConditions, id, idNum]
  );
  if (!rows[0]) return NextResponse.json({ error: "Animal introuvable." }, { status: 404 });
  return NextResponse.json({ pet: rows[0] });
}

export async function DELETE(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const inv = await query(
    "SELECT 1 FROM visits v JOIN invoices i ON i.id = v.invoice_id WHERE v.pet_id = $1 AND NOT i.is_test LIMIT 1",
    [id]
  );
  if (inv.rows[0]) {
    return NextResponse.json(
      { error: "Cet animal a des visites facturées : il ne peut pas être supprimé (les factures doivent rester complètes)." },
      { status: 409 }
    );
  }
  const urls = await visitPhotoUrls({ query }, "v.pet_id = $1", [id]);
  await query("DELETE FROM pets WHERE id = $1", [id]);
  await deleteBlobs(urls);
  return NextResponse.json({ ok: true });
}
