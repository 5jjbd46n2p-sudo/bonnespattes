import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
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
