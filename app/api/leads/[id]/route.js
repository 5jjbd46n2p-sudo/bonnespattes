import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isUuid, readJson } from "@/lib/api";

export async function PATCH(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  const body = await readJson(req);
  // CLIENT n'est posé que par la conversion (/convert).
  if (!["NOUVEAU", "CONTACTE", "SANS_SUITE"].includes(body?.status)) {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }
  const { rows } = await query("UPDATE leads SET status = $1 WHERE id = $2 AND status <> 'CLIENT' RETURNING id, status", [
    body.status,
    id,
  ]);
  if (!rows[0]) {
    const ex = await query("SELECT status FROM leads WHERE id = $1", [id]);
    if (!ex.rows[0]) return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
    return NextResponse.json({ error: "Cette demande est déjà convertie en client." }, { status: 409 });
  }
  return NextResponse.json({ lead: rows[0] });
}
