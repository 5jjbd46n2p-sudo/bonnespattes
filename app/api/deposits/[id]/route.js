import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/api";

export async function DELETE(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  const existing = await query("SELECT invoice_id FROM deposits WHERE id = $1", [id]);
  if (!existing.rows[0]) {
    return NextResponse.json({ error: "Acompte introuvable." }, { status: 404 });
  }
  if (existing.rows[0].invoice_id) {
    return NextResponse.json(
      { error: "Cet acompte est déjà appliqué à une facture, il ne peut plus être supprimé." },
      { status: 400 }
    );
  }

  await query("DELETE FROM deposits WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
