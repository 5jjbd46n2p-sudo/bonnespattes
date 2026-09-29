import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/api";

// Types et taille acceptés pour une photo de visite : on ne fait pas confiance
// au nom de fichier envoyé par le navigateur (facilement falsifiable), on
// vérifie le vrai type MIME et la taille avant tout envoi vers le stockage.
const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};
const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 Mo

export async function POST(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  if (!file) return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Format non pris en charge : seules les photos (JPEG, PNG, WEBP, HEIC) sont acceptées." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Photo trop volumineuse (15 Mo maximum)." }, { status: 400 });
  }

  try {
    const blob = await put(`visits/${id}/${Date.now()}.${ext}`, file, {
      access: "private",
      addRandomSuffix: true,
      contentType: file.type,
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
          "Échec de l'envoi de la photo. Vérifie que le stockage Vercel Blob (privé) est bien connecté au projet, puis redéploie.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const { rows } = await query("SELECT * FROM photos WHERE visit_id = $1 ORDER BY created_at DESC", [id]);
  return NextResponse.json({ photos: rows });
}
