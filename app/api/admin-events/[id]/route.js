import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isUuid, readJson } from "@/lib/api";

export async function PATCH(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const b = await readJson(req);
  if (typeof b.done !== "boolean") return NextResponse.json({ error: "Rien à mettre à jour." }, { status: 400 });
  const { rowCount } = await query("UPDATE admin_events SET done = $1 WHERE id = $2", [b.done, id]);
  if (!rowCount) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const { rowCount } = await query("DELETE FROM admin_events WHERE id = $1", [id]);
  if (!rowCount) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
