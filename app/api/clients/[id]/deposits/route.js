import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
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
  const { amount, date, method, notes } = await req.json();
  if (!amount || Number(amount) <= 0) {
    return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
  }
  const { rows } = await query(
    `INSERT INTO deposits (client_id, amount, date, method, notes) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [id, amount, date || new Date().toISOString().slice(0, 10), method || "Virement", notes || ""]
  );
  return NextResponse.json({ deposit: rows[0] });
}
