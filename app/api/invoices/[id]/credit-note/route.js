import { NextResponse } from "next/server";
import { tx } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { allocateInvoiceNumber } from "@/lib/invoiceNumber";
import { isUuid, readJson } from "@/lib/api";
import { audit } from "@/lib/audit";

// Annulation d'une facture émise par un avoir : nouvelle facture numérotée
// dans la même suite, aux montants opposés, qui référence la facture annulée.
// La facture d'origine reste intacte (conservation légale) ; ses visites
// redeviennent « à facturer ». Les paiements déjà reçus ne sont pas modifiés :
// un éventuel remboursement se fait à part.
export async function POST(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
  const body = await readJson(req);
  const replacing = body?.reason === "replace";

  try {
    const result = await tx(async (db) => {
      const cur = await db.query("SELECT * FROM invoices WHERE id = $1 FOR UPDATE", [id]);
      const inv = cur.rows[0];
      if (!inv) return { status: 404, error: "Facture introuvable." };
      if (inv.is_test) return { status: 400, error: "Une facture de test se supprime, sans avoir." };
      if (inv.status === "BROUILLON") return { status: 400, error: "Un brouillon se supprime simplement, sans avoir." };
      if (inv.credit_note_of) return { status: 400, error: "On n'annule pas un avoir." };
      const already = await db.query("SELECT number FROM invoices WHERE credit_note_of = $1", [id]);
      if (already.rows[0]) return { status: 409, error: `Déjà annulée par l'avoir ${already.rows[0].number}.` };

      const settings = (await db.query("SELECT * FROM settings LIMIT 1 FOR UPDATE")).rows[0];
      const number = await allocateInvoiceNumber(db, settings, false);
      const neg = (v) => -Number(v || 0);
      const ins = await db.query(
        `INSERT INTO invoices (client_id, number, tva_rate, total_ht, total_tva, total_ttc, notes, status, credit_note_of)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'BROUILLON',$8) RETURNING *`,
        [inv.client_id, number, inv.tva_rate, neg(inv.total_ht), neg(inv.total_tva), neg(inv.total_ttc),
         `Avoir annulant la facture ${inv.number}.`, id]
      );
      const note = ins.rows[0];
      const items = await db.query("SELECT * FROM invoice_items WHERE invoice_id = $1", [id]);
      for (const it of items.rows) {
        await db.query(
          "INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) VALUES ($1,$2,$3,$4,$5)",
          [note.id, `Annulation : ${it.description}`, it.quantity, neg(it.unit_price), neg(it.total)]
        );
      }
      // Avoir créé en brouillon, lignes ajoutées, puis émis : une facture émise
      // ne reçoit plus de nouvelles lignes (verrou en base).
      await db.query("UPDATE invoices SET status = 'ENVOYEE' WHERE id = $1", [note.id]);
      await audit(db, {
        actorId: admin.id,
        action: replacing ? "invoice.replace" : "invoice.credit_note",
        entity: "invoice",
        entityId: id,
        details: { number: inv.number, creditNote: number },
      });
      // Les visites peuvent être refacturées, les crédits de parrainage réutilisés.
      await db.query("UPDATE visits SET invoice_id = NULL WHERE invoice_id = $1", [id]);
      await db.query("UPDATE client_credits SET used_at = NULL, used_invoice_id = NULL WHERE used_invoice_id = $1", [id]);
      return { note };
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, creditNote: { id: result.note.id, number: result.note.number } });
  } catch (e) {
    console.error("/api/invoices/[id]/credit-note :", e?.message);
    return NextResponse.json({ error: "Création de l'avoir impossible, réessaie dans un instant." }, { status: 500 });
  }
}
