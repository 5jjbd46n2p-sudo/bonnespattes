import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { cleanText, readJson } from "@/lib/api";

export async function POST(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const b = await readJson(req);
  const author = cleanText(b.author, 60);
  const body = cleanText(b.body, 600);
  if (!author) return NextResponse.json({ error: "Indique le prénom de la personne." }, { status: 400 });
  if (!body) return NextResponse.json({ error: "Écris l'avis." }, { status: 400 });
  if (b.consent !== true) {
    return NextResponse.json({ error: "Confirme que la personne a donné son accord pour publier son avis." }, { status: 400 });
  }
  const { rows } = await query(
    "INSERT INTO testimonials (author, detail, body, published) VALUES ($1,$2,$3,$4) RETURNING id",
    [author, cleanText(b.detail, 80), body, b.published !== false]
  );
  return NextResponse.json({ testimonial: rows[0] }, { status: 201 });
}
