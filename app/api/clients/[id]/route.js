import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;

  const clientRes = await query("SELECT * FROM clients WHERE id = $1", [id]);
  if (!clientRes.rows[0]) {
    return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  }
  const petsRes = await query(
    "SELECT * FROM pets WHERE client_id = $1 ORDER BY created_at",
    [id]
  );
  const visitsRes = await query(
    `SELECT v.*, p.name AS pet_name,
      (SELECT COUNT(*) FROM photos ph WHERE ph.visit_id = v.id) AS photo_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.visit_id = v.id) AS task_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.visit_id = v.id AND t.done) AS task_done_count
     FROM visits v JOIN pets p ON p.id = v.pet_id
     WHERE v.client_id = $1 ORDER BY v.date DESC, v.start_time DESC LIMIT 100`,
    [id]
  );
  const invoicesRes = await query(
    "SELECT * FROM invoices WHERE client_id = $1 ORDER BY issue_date DESC",
    [id]
  );
  const loginRes = await query("SELECT id, email FROM users WHERE client_id = $1", [id]);

  return NextResponse.json({
    client: clientRes.rows[0],
    pets: petsRes.rows,
    visits: visitsRes.rows,
    invoices: invoicesRes.rows,
    login: loginRes.rows[0] || null,
  });
}

export async function PATCH(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const fields = ["first_name", "last_name", "phone", "email", "address", "notes", "hourly_rate"];
  const map = {
    firstName: "first_name",
    lastName: "last_name",
    phone: "phone",
    email: "email",
    address: "address",
    notes: "notes",
    hourlyRate: "hourly_rate",
    distanceKm: "distance_km",
    travelMinutes: "travel_minutes",
  };
  for (const key of ["distanceKm", "travelMinutes"]) {
    if (body[key] !== undefined && body[key] !== null && body[key] !== "") {
      const n = Number(body[key]);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: "Distance ou durée invalide." }, { status: 400 });
      }
      body[key] = key === "travelMinutes" ? Math.round(n) : n;
    } else if (body[key] === "") {
      body[key] = null;
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
  if (sets.length === 0) {
    return NextResponse.json({ error: "Rien à mettre à jour." }, { status: 400 });
  }
  values.push(id);
  const { rows } = await query(
    `UPDATE clients SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
    values
  );
  return NextResponse.json({ client: rows[0] });
}

export async function DELETE(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;

  // Droit à l'effacement (RGPD) : on supprime aussi les photos stockées chez
  // le fournisseur de stockage (Vercel Blob), qui ne sont pas nettoyées par
  // la suppression en cascade en base — celle-ci ne supprime que les lignes SQL.
  const photosRes = await query(
    `SELECT ph.url FROM photos ph JOIN visits v ON v.id = ph.visit_id WHERE v.client_id = $1`,
    [id]
  );
  for (const photo of photosRes.rows) {
    try {
      await del(photo.url);
    } catch (e) {
      console.warn("Suppression blob échouée (ignorée) :", e.message);
    }
  }

  await query("DELETE FROM clients WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
