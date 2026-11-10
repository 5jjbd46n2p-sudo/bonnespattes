import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdmin } from "@/lib/auth";
import { sniffImageType, matchesDeclaredType } from "@/lib/imageMagic";
import { insertDesignAsset } from "@/lib/designData";

// Pas de HEIC : la toile du navigateur ne sait pas l'afficher.
const ALLOWED_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 Mo
const BAD_FORMAT = "Format non pris en charge : seules les photos JPEG, PNG ou WEBP sont acceptées.";

export async function POST(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  let form;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  }
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return NextResponse.json({ error: BAD_FORMAT }, { status: 400 });
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Photo trop volumineuse (10 Mo maximum)." }, { status: 400 });
  }
  // Contenu réel du fichier (octets magiques), pas seulement le type annoncé.
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!matchesDeclaredType(sniffImageType(head), file.type)) {
    return NextResponse.json({ error: BAD_FORMAT }, { status: 400 });
  }

  try {
    const blob = await put(`designs/${Date.now()}.${ext}`, file, {
      access: "private",
      addRandomSuffix: true,
      contentType: file.type,
    });
    const row = await insertDesignAsset({ blobUrl: blob.url, contentType: file.type, bytes: file.size });
    return NextResponse.json(
      { asset: { id: row.id, src: `/api/designs/assets/${row.id}` } },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/designs/assets :", e?.message);
    return NextResponse.json(
      {
        error:
          "Échec de l'envoi de la photo. Vérifie que le stockage Vercel Blob (privé) est bien connecté au projet, puis réessaie.",
      },
      { status: 500 }
    );
  }
}
