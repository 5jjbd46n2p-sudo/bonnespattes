import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getDocument } from "@/lib/documents";
import { planTasks } from "@/lib/planTasks";

// Ajoute au planning les tâches datées d'un document. Sans doublon : une tâche
// déjà présente (même date, même titre) est laissée telle quelle, modifiée ou non.
export async function POST(_req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { slug } = await params;
  const doc = getDocument(slug);
  const tasks = doc ? planTasks(doc.slug) : [];
  if (!tasks.length) return NextResponse.json({ error: "Document introuvable." }, { status: 404 });

  try {
    const { rows } = await query(
      `INSERT INTO admin_events (date, kind, title, notes)
       SELECT v.d::date, v.kind, v.title, v.notes
         FROM unnest($1::text[], $2::text[], $3::text[], $4::text[]) AS v(d, kind, title, notes)
        WHERE NOT EXISTS (
          SELECT 1 FROM admin_events e WHERE e.date = v.d::date AND e.title = v.title
        )
       RETURNING id`,
      [tasks.map((t) => t.date), tasks.map((t) => t.kind), tasks.map((t) => t.title), tasks.map((t) => t.notes)]
    );
    return NextResponse.json({ added: rows.length, total: tasks.length });
  } catch (e) {
    console.error("/api/documents/[slug]/planning :", e?.message);
    return NextResponse.json({ error: "Ajout impossible, réessaie." }, { status: 500 });
  }
}
