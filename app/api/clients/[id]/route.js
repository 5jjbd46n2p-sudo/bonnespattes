import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { eraseClient } from "@/lib/privacy";
import { isUuid, readJson } from "@/lib/api";

export async function GET(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });

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
  if (!isUuid(id)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const body = await readJson(req);
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
  // Type et longueur des textes : refus clair plutôt qu'une valeur tronquée ou une erreur SQL.
  const TEXT_MAX = { firstName: 100, lastName: 100, phone: 40, email: 200, address: 300, notes: 5000 };
  for (const [key, max] of Object.entries(TEXT_MAX)) {
    if (body[key] === undefined) continue;
    if (body[key] === null) body[key] = "";
    if (typeof body[key] !== "string") return NextResponse.json({ error: "Champ invalide." }, { status: 400 });
    body[key] = body[key].trim();
    if (body[key].length > max) {
      return NextResponse.json({ error: `Texte trop long (${max} caractères maximum).` }, { status: 400 });
    }
  }
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  }
  if (body.hourlyRate !== undefined) {
    const n = body.hourlyRate === null || body.hourlyRate === "" ? 0 : Number(body.hourlyRate);
    if (!Number.isFinite(n) || n < 0 || n > 1000) {
      return NextResponse.json({ error: "Tarif horaire invalide." }, { status: 400 });
    }
    body.hourlyRate = Math.round(n * 100) / 100;
  }
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
  if (!isUuid(id)) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });

  // Droit à l'effacement (RGPD) : suppression complète, ou anonymisation si des
  // factures existent (elles doivent légalement être conservées 10 ans).
  try {
    const mode = await eraseClient(id);
    if (!mode) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
    return NextResponse.json({ ok: true, mode });
  } catch (e) {
    console.error("Suppression d'un client :", e?.message);
    return NextResponse.json({ error: "Suppression impossible, réessaie dans un instant." }, { status: 500 });
  }
}
