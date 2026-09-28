import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { rows } = await query("SELECT * FROM settings LIMIT 1");
  return NextResponse.json({ settings: rows[0] });
}

export async function PATCH(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const body = await req.json();
  const map = {
    businessName: "business_name",
    businessAddress: "business_address",
    siret: "siret",
    tvaNumber: "tva_number",
    iban: "iban",
    defaultTvaRate: "default_tva_rate",
    invoicePrefix: "invoice_prefix",
    legalForm: "legal_form",
    contactEmail: "contact_email",
  };
  const sets = [];
  const values = [];
  let i = 1;
  for (const [key, col] of Object.entries(map)) {
    if (body[key] !== undefined) {
      sets.push(`${col} = $${i++}`);
      values.push(body[key]);
    }
  }
  if (!sets.length) return NextResponse.json({ error: "Rien à mettre à jour." }, { status: 400 });
  const current = await query("SELECT id FROM settings LIMIT 1");
  values.push(current.rows[0].id);
  const { rows } = await query(`UPDATE settings SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`, values);
  return NextResponse.json({ settings: rows[0] });
}
