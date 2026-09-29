import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { todayISO } from "@/lib/utils";
import { cleanText, isUuid, parseAmount, parseDateISO, readJson } from "@/lib/api";

export async function GET(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const { searchParams } = new URL(req.url);
  const available = searchParams.get("available");

  const conditions = ["d.client_id = $1"];
  if (available === "1") conditions.push("d.invoice_id IS NULL");

  const { rows } = await query(
    `SELECT d.*, i.number AS invoice_number
     FROM deposits d LEFT JOIN invoices i ON i.id = d.invoice_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY d.date DESC, d.created_at DESC`,
    [id]
  );
  return NextResponse.json({ deposits: rows });
}

export async function POST(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const body = await readJson(req);
  const amount = parseAmount(body.amount);
  if (amount === null) return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
  const date = body.date ? parseDateISO(body.date) : todayISO();
  if (!date) return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  const { rows } = await query(
    `INSERT INTO deposits (client_id, amount, date, method, notes)
     SELECT id, $2, $3, $4, $5 FROM clients WHERE id = $1 RETURNING *`,
    [id, amount, date, cleanText(body.method, 50) || "Virement", cleanText(body.notes, 500)]
  );
  if (!rows[0]) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  return NextResponse.json({ deposit: rows[0] });
}
