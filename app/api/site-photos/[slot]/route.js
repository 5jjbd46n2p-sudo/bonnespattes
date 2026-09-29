import { NextResponse } from "next/server";
import { put, get, del } from "@vercel/blob";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isSiteSlot } from "@/lib/sitePhotos";

const ALLOWED = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_SIZE = 4 * 1024 * 1024; // le navigateur réduit la photo avant l'envoi

const pathOf = (url) => decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));

// Public : les photos de la page d'accueil sont visibles de tous (stockage privé, diffusé ici).
export async function GET(req, { params }) {
  const { slot } = await params;
  if (!isSiteSlot(slot)) return new NextResponse("Introuvable.", { status: 404 });
  try {
    const { rows } = await query("SELECT url FROM site_photos WHERE slot = $1", [slot]);
    if (!rows[0]) return new NextResponse("Introuvable.", { status: 404 });
    const result = await get(pathOf(rows[0].url), {
      access: "private",
      ifNoneMatch: req.headers.get("if-none-match") ?? undefined,
    });
    if (!result) return new NextResponse("Introuvable.", { status: 404 });
    const headers = { ETag: result.blob.etag, "Cache-Control": "public, max-age=31536000, immutable" };
    if (result.statusCode === 304) return new NextResponse(null, { status: 304, headers });
    return new NextResponse(result.stream, {
      headers: { ...headers, "Content-Type": result.blob.contentType, "X-Content-Type-Options": "nosniff" },
    });
  } catch (e) {
    console.error(e);
    return new NextResponse("Erreur serveur.", { status: 500 });
  }
}

export async function POST(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { slot } = await params;
  if (!isSiteSlot(slot)) return NextResponse.json({ error: "Emplacement inconnu." }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  const ext = ALLOWED[file.type];
  if (!ext) return NextResponse.json({ error: "Format non pris en charge (JPEG, PNG ou WEBP)." }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Photo trop volumineuse." }, { status: 400 });

  try {
    const old = await query("SELECT url FROM site_photos WHERE slot = $1", [slot]);
    const blob = await put(`site/${slot}.${ext}`, file, { access: "private", addRandomSuffix: true, contentType: file.type });
    const { rows } = await query(
      `INSERT INTO site_photos (slot, url, updated_at) VALUES ($1,$2,now())
       ON CONFLICT (slot) DO UPDATE SET url = EXCLUDED.url, updated_at = now() RETURNING updated_at`,
      [slot, blob.url]
    );
    if (old.rows[0]) await del(old.rows[0].url).catch(() => {});
    return NextResponse.json({ ok: true, v: new Date(rows[0].updated_at).getTime() });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Échec de l'envoi de la photo. Réessaie dans un instant." }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { slot } = await params;
  if (!isSiteSlot(slot)) return NextResponse.json({ error: "Emplacement inconnu." }, { status: 404 });
  try {
    const { rows } = await query("DELETE FROM site_photos WHERE slot = $1 RETURNING url", [slot]);
    if (rows[0]) await del(rows[0].url).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Suppression impossible." }, { status: 500 });
  }
}
