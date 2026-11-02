import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { cleanText, isUuid, readJson } from "@/lib/api";

export async function PATCH(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const b = await readJson(req);
  if (typeof b.published === "boolean" && b.body === undefined) {
    const { rowCount } = await query("UPDATE testimonials SET published = $1 WHERE id = $2", [b.published, id]);
    if (!rowCount) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    return NextResponse.json({ ok: true });
  }
  const author = cleanText(b.author, 60);
  const body = cleanText(b.body, 600);
  if (!author || !body) return NextResponse.json({ error: "Prénom et avis obligatoires." }, { status: 400 });
  const { rowCount } = await query("UPDATE testimonials SET author = $1, detail = $2, body = $3 WHERE id = $4", [
    author,
    cleanText(b.detail, 80),
    body,
    id,
  ]);
  if (!rowCount) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const { rowCount } = await query("DELETE FROM testimonials WHERE id = $1", [id]);
  if (!rowCount) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
