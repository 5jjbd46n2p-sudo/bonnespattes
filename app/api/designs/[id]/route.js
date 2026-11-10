import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { isUuid, readJson } from "@/lib/api";
import { parseDesignPatch } from "@/lib/designFields";
import { loadDesign, updateDesign, deleteDesign } from "@/lib/designData";

const unauthorized = () => NextResponse.json({ error: "Non autorisé." }, { status: 401 });
const notFound = () => NextResponse.json({ error: "Conception introuvable." }, { status: 404 });

export async function GET(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  try {
    const design = await loadDesign(id);
    if (!design) return notFound();
    return NextResponse.json({ design });
  } catch (e) {
    console.error("GET /api/designs/[id] :", e?.message);
    return NextResponse.json({ error: "Impossible de charger la conception." }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return notFound();

  const parsed = parseDesignPatch(await readJson(req));
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const design = await updateDesign(id, parsed.value);
    if (!design) return notFound();
    return NextResponse.json({ design });
  } catch (e) {
    console.error("PATCH /api/designs/[id] :", e?.message);
    return NextResponse.json({ error: "Impossible d'enregistrer la conception." }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  try {
    const deleted = await deleteDesign(id);
    if (!deleted) return notFound();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/designs/[id] :", e?.message);
    return NextResponse.json({ error: "Impossible de supprimer la conception." }, { status: 500 });
  }
}
