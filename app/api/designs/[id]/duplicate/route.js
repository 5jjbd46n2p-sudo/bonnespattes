import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/api";
import { duplicateDesign } from "@/lib/designData";

export async function POST(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Conception introuvable." }, { status: 404 });
  try {
    const design = await duplicateDesign(id);
    if (!design) return NextResponse.json({ error: "Conception introuvable." }, { status: 404 });
    return NextResponse.json({ design }, { status: 201 });
  } catch (e) {
    console.error("POST /api/designs/[id]/duplicate :", e?.message);
    return NextResponse.json({ error: "Impossible de dupliquer la conception." }, { status: 500 });
  }
}
