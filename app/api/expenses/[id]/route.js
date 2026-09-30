import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/api";

export async function DELETE(_req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Charge introuvable." }, { status: 404 });
  const { rowCount } = await query("DELETE FROM expenses WHERE id = $1", [id]);
  if (!rowCount) return NextResponse.json({ error: "Charge introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
