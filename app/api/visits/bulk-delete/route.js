import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { query, tx } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const UUID = /^[0-9a-f-]{36}$/i;

// Suppression de plusieurs visites d'un coup (nettoyage). Une visite rattachée à une vraie
// facture ne peut pas être supprimée ; celles d'une facture de test le peuvent.
export async function POST(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? [...new Set(body.ids)] : [];
  if (ids.length === 0 || ids.length > 200 || ids.some((x) => typeof x !== "string" || !UUID.test(x))) {
    return NextResponse.json({ error: "Sélection invalide." }, { status: 400 });
  }
  try {
    const photos = await query(`SELECT url FROM photos WHERE visit_id = ANY($1::uuid[])`, [ids]);
    const deleted = await tx(async (client) => {
      const blocked = await client.query(
        `SELECT COUNT(*)::int AS n FROM visits v JOIN invoices i ON i.id = v.invoice_id
         WHERE v.id = ANY($1::uuid[]) AND NOT i.is_test`,
        [ids]
      );
      if (blocked.rows[0].n > 0) {
        const e = new Error("Une visite est rattachée à une vraie facture : elle ne peut pas être supprimée.");
        e.status = 409;
        throw e;
      }
      const r = await client.query("DELETE FROM visits WHERE id = ANY($1::uuid[])", [ids]);
      return r.rowCount;
    });
    // Nettoyage des fichiers de photos (Vercel Blob), sans bloquer si l'un échoue.
    for (const p of photos.rows) {
      try {
        await del(p.url);
      } catch (e) {
        console.warn("Suppression blob échouée (ignorée) :", e.message);
      }
    }
    return NextResponse.json({ ok: true, deleted });
  } catch (e) {
    if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Suppression impossible, réessaie dans un instant." }, { status: 500 });
  }
}
