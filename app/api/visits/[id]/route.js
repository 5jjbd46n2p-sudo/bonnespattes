import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { deleteBlobs, visitPhotoUrls } from "@/lib/privacy";
import { isUuid, parseDateISO, readJson } from "@/lib/api";

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  const visitRes = await query(
    `SELECT v.*, p.name AS pet_name, p.species, p.breed, c.first_name, c.last_name, c.address
     FROM visits v JOIN pets p ON p.id = v.pet_id JOIN clients c ON c.id = v.client_id
     WHERE v.id = $1`,
    [id]
  );
  const visit = visitRes.rows[0];
  if (!visit) return NextResponse.json({ error: "Visite introuvable." }, { status: 404 });

  // Un client ne peut voir que ses propres visites
  if (user.role === "CLIENT" && visit.client_id !== user.client_id) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  const tasksRes = await query(
    "SELECT * FROM tasks WHERE visit_id = $1 ORDER BY position, label",
    [id]
  );
  const photosRes = await query(
    "SELECT * FROM photos WHERE visit_id = $1 ORDER BY created_at DESC",
    [id]
  );

  return NextResponse.json({ visit, tasks: tasksRes.rows, photos: photosRes.rows });
}

export async function PATCH(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const body = await readJson(req);
  const map = {
    status: "status",
    notes: "notes",
    price: "price",
    date: "date",
    startTime: "start_time",
    endTime: "end_time",
    isFree: "is_free",
    freeReason: "free_reason",
    travelFee: "travel_fee",
  };
  for (const key of ["price", "travelFee"]) {
    if (body[key] !== undefined) {
      const n = Number(body[key]);
      if (body[key] === "" || body[key] === null || !Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: "Montant invalide (nombre positif attendu)." }, { status: 400 });
      }
      body[key] = n;
    }
  }
  if (body.isFree !== undefined) body.isFree = Boolean(body.isFree);
  if (body.freeReason !== undefined) body.freeReason = String(body.freeReason ?? "").slice(0, 300);
  if (body.notes !== undefined) body.notes = String(body.notes ?? "").slice(0, 2000);
  if (body.status !== undefined && !["PLANIFIE", "EN_COURS", "FAIT", "ANNULE"].includes(body.status)) {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }
  if (body.date !== undefined && !parseDateISO(body.date)) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }
  for (const key of ["startTime", "endTime"]) {
    if (body[key] === "") body[key] = null;
    if (body[key] !== undefined && body[key] !== null && !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(body[key])) {
      return NextResponse.json({ error: "Horaire invalide." }, { status: 400 });
    }
  }
  // Une visite déjà facturée (vraie facture) ne change plus de montant : la
  // facture et la visite resteraient sinon en désaccord.
  if (["price", "travelFee", "isFree"].some((k) => body[k] !== undefined)) {
    const inv = await query(
      "SELECT 1 FROM visits v JOIN invoices i ON i.id = v.invoice_id WHERE v.id = $1 AND NOT i.is_test",
      [id]
    );
    if (inv.rows[0]) {
      return NextResponse.json(
        { error: "Cette visite est déjà facturée : son montant ne peut plus changer (établis un avoir si besoin)." },
        { status: 409 }
      );
    }
  }
  const sets = [];
  const values = [];
  let i = 1;
  for (const [key, col] of Object.entries(map)) {
    if (body[key] !== undefined) {
      sets.push(`${col} = $${i++}`);
      values.push(body[key]);
    }
  }
  if (sets.length === 0) return NextResponse.json({ error: "Rien à mettre à jour." }, { status: 400 });
  values.push(id);
  const { rows } = await query(
    `UPDATE visits SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
    values
  );
  if (!rows[0]) return NextResponse.json({ error: "Visite introuvable." }, { status: 404 });
  return NextResponse.json({ visit: rows[0] });
}

export async function DELETE(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const { searchParams } = new URL(req.url);

  // Si la visite fait partie d'une série récurrente et que la suppression de
  // la série a été demandée, on supprime aussi les occurrences futures encore
  // planifiées (on ne touche jamais à celles déjà faites/annulées).
  const current = await query(
    `SELECT v.recurrence_id, v.date, (i.id IS NOT NULL AND NOT i.is_test) AS invoiced
       FROM visits v LEFT JOIN invoices i ON i.id = v.invoice_id WHERE v.id = $1`,
    [id]
  );
  const v = current.rows[0];
  if (!v) return NextResponse.json({ error: "Visite introuvable." }, { status: 404 });

  if (searchParams.get("series") === "1" && v.recurrence_id) {
    // Occurrences futures encore planifiées (jamais facturées par définition)
    const where = "v.recurrence_id = $1 AND v.date >= $2 AND v.status = 'PLANIFIE'";
    const urls = await visitPhotoUrls({ query }, where, [v.recurrence_id, v.date]);
    await query(`DELETE FROM visits v WHERE ${where}`, [v.recurrence_id, v.date]);
    await deleteBlobs(urls);
    return NextResponse.json({ ok: true });
  }

  // Même règle que la suppression groupée : une visite d'une vraie facture reste.
  if (v.invoiced) {
    return NextResponse.json(
      { error: "Cette visite figure sur une facture : elle ne peut pas être supprimée." },
      { status: 409 }
    );
  }
  const urls = await visitPhotoUrls({ query }, "v.id = $1", [id]);
  await query("DELETE FROM visits WHERE id = $1", [id]);
  await deleteBlobs(urls);
  return NextResponse.json({ ok: true });
}
