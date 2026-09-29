import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isUuid, readJson } from "@/lib/api";

// Le client renseigne lui-même le numéro de puce ou de tatouage de son animal (facultatif, conseillé).
export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENT") return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Animal introuvable." }, { status: 404 });
  const body = await readJson(req);
  const num = typeof body?.identificationNumber === "string" ? body.identificationNumber.trim() : null;
  if (num === null || !/^[A-Za-z0-9 .-]{0,30}$/.test(num)) {
    return NextResponse.json({ error: "Numéro invalide (chiffres, lettres, tirets ; 30 caractères maximum)." }, { status: 400 });
  }
  const { rows } = await query(
    `UPDATE pets SET identification_number = $1, identified = identified OR $1 <> ''
     WHERE id = $2 AND client_id = $3 RETURNING id, identification_number`,
    [num, id, user.client_id]
  );
  if (!rows[0]) return NextResponse.json({ error: "Animal introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true, identificationNumber: rows[0].identification_number });
}
