import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function DELETE(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  const { rows } = await query("SELECT * FROM photos WHERE id = $1", [id]);
  const photo = rows[0];
  if (photo) {
    try {
      await del(photo.url);
    } catch (e) {
      console.warn("Suppression blob échouée (ignorée) :", e.message);
    }
    await query("DELETE FROM photos WHERE id = $1", [id]);
  }
  return NextResponse.json({ ok: true });
}
