import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;

  const form = await req.formData();
  const file = form.get("file");
  if (!file) return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });

  try {
    const ext = (file.name || "photo.jpg").split(".").pop();
    const blob = await put(`visits/${id}/${Date.now()}.${ext}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    const { rows } = await query(
      "INSERT INTO photos (visit_id, url) VALUES ($1,$2) RETURNING *",
      [id, blob.url]
    );
    return NextResponse.json({ photo: rows[0] });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        error:
          "Échec de l'envoi de la photo. Vérifie que le stockage Vercel Blob est bien connecté (BLOB_READ_WRITE_TOKEN). Détail : " +
          e.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  const { rows } = await query("SELECT * FROM photos WHERE visit_id = $1 ORDER BY created_at DESC", [id]);
  return NextResponse.json({ photos: rows });
}
