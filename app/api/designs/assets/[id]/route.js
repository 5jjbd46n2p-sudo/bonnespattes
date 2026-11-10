import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/api";
import { loadDesignAsset } from "@/lib/designData";

// Photos envoyées depuis l'éditeur : stockage Vercel Blob PRIVÉ, diffusées
// ici à l'admin seulement. Le contenu d'un identifiant ne change jamais.
const CACHE = "private, max-age=31536000, immutable";

export async function GET(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return new NextResponse("Non autorisé.", { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return new NextResponse("Introuvable.", { status: 404 });

  try {
    const asset = await loadDesignAsset(id);
    if (!asset) return new NextResponse("Introuvable.", { status: 404 });
    const pathname = decodeURIComponent(new URL(asset.blob_url).pathname.replace(/^\//, ""));
    const result = await get(pathname, {
      access: "private",
      ifNoneMatch: req.headers.get("if-none-match") ?? undefined,
    });
    if (!result) return new NextResponse("Introuvable.", { status: 404 });
    if (result.statusCode === 304) {
      return new NextResponse(null, { status: 304, headers: { ETag: result.blob.etag, "Cache-Control": CACHE } });
    }
    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType || asset.content_type,
        "X-Content-Type-Options": "nosniff",
        ETag: result.blob.etag,
        "Cache-Control": CACHE,
      },
    });
  } catch (e) {
    console.error("GET /api/designs/assets/[id] :", e?.message);
    return new NextResponse("Erreur serveur.", { status: 500 });
  }
}
