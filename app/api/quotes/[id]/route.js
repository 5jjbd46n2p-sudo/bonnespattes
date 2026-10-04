import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isUuid, readJson } from "@/lib/api";

export async function PATCH(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
  const { status } = await readJson(req);
  if (!["EN_ATTENTE", "ACCEPTE", "REFUSE"].includes(status)) return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  const { rows } = await query(
    "UPDATE quotes SET status = $1, accepted_at = CASE WHEN $1 = 'ACCEPTE' THEN now() ELSE NULL END WHERE id = $2 RETURNING id, status",
    [status, id]
  );
  if (!rows[0]) return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
  return NextResponse.json({ quote: rows[0] });
}

export async function DELETE(_req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
  const { rowCount } = await query("DELETE FROM quotes WHERE id = $1 AND status <> 'ACCEPTE'", [id]);
  if (!rowCount) return NextResponse.json({ error: "Devis introuvable ou déjà accepté (il se conserve)." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
