import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readJson } from "@/lib/api";
import { getDocument, checklistIds } from "@/lib/documents";
import { setDone } from "@/lib/docChecklist";

// Coche ou décoche une case de la checklist d'un document.
export async function POST(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { slug } = await params;
  const doc = getDocument(slug);
  if (!doc) return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  const body = await readJson(req);
  if (typeof body.item !== "string" || !checklistIds(doc).includes(body.item) || typeof body.done !== "boolean") {
    return NextResponse.json({ error: "Case invalide." }, { status: 400 });
  }
  try {
    await setDone(doc.slug, body.item, body.done);
  } catch (e) {
    console.error("/api/documents/[slug]/checklist :", e?.message);
    return NextResponse.json({ error: "Enregistrement impossible, réessaie." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
