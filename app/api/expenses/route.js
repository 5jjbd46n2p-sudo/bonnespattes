import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { cleanText, parseAmount, parseDateISO, readJson } from "@/lib/api";
import { EXPENSE_CATEGORIES } from "@/lib/expenses";

export async function POST(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const body = await readJson(req);
  const date = parseDateISO(body.date);
  const label = cleanText(body.label, 120);
  const amount = parseAmount(body.amount);
  const category = EXPENSE_CATEGORIES.includes(body.category) ? body.category : "Autre";
  if (!date) return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  if (!label) return NextResponse.json({ error: "Indique un libellé." }, { status: 400 });
  if (amount === null) return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
  const { rows } = await query(
    "INSERT INTO expenses (date, label, category, amount, notes) VALUES ($1,$2,$3,$4,$5) RETURNING *",
    [date, label, category, amount, cleanText(body.notes, 500)]
  );
  return NextResponse.json({ expense: rows[0] }, { status: 201 });
}
