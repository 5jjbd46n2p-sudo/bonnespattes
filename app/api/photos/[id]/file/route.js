import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isUuid } from "@/lib/api";

// Les photos sont stockées dans un espace Vercel Blob PRIVÉ : elles n'ont pas
// d'adresse publique. Cette route vérifie qui demande la photo (l'admin, ou le
// client propriétaire de la visite) puis la diffuse.
export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Non autorisé.", { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return new NextResponse("Introuvable.", { status: 404 });

  const { rows } = await query(
    `SELECT ph.url, v.client_id FROM photos ph JOIN visits v ON v.id = ph.visit_id WHERE ph.id = $1`,
    [id]
  );
  const photo = rows[0];
  if (!photo) return new NextResponse("Introuvable.", { status: 404 });
  if (user.role === "CLIENT" && photo.client_id !== user.client_id) {
    return new NextResponse("Non autorisé.", { status: 403 });
  }

  try {
    const pathname = decodeURIComponent(new URL(photo.url).pathname.replace(/^\//, ""));
    const result = await get(pathname, {
      access: "private",
      ifNoneMatch: req.headers.get("if-none-match") ?? undefined,
    });
    if (!result) return new NextResponse("Introuvable.", { status: 404 });
    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: { ETag: result.blob.etag, "Cache-Control": "private, no-cache" },
      });
    }
    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType,
        "X-Content-Type-Options": "nosniff",
        ETag: result.blob.etag,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (e) {
    console.error(e);
    return new NextResponse("Erreur serveur.", { status: 500 });
  }
}
