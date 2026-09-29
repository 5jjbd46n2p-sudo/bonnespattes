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
    kmRate: "km_rate",
    travelTimeShare: "travel_time_share",
    travelFreeKm: "travel_free_km",
    rate30: "rate_30",
    rate45: "rate_45",
    rate60: "rate_60",
    referralCredit: "referral_credit",
    serviceArea: "service_area",
  };
  for (const key of ["kmRate", "travelTimeShare", "travelFreeKm", "rate30", "rate45", "rate60", "referralCredit"]) {
    if (body[key] !== undefined) {
      const n = Number(body[key]);
      if (body[key] === "" || body[key] === null || !Number.isFinite(n) || n < 0 || (key === "travelTimeShare" && n > 1)) {
        return NextResponse.json({ error: "Valeur de tarif invalide." }, { status: 400 });
      }
      body[key] = n;
    }
  }
  if (body.serviceArea !== undefined) {
    if (typeof body.serviceArea !== "string" || body.serviceArea.length > 200) {
      return NextResponse.json({ error: "Zone d'intervention invalide." }, { status: 400 });
    }
    body.serviceArea = body.serviceArea.trim();
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
  if (!sets.length) return NextResponse.json({ error: "Rien à mettre à jour." }, { status: 400 });
  const current = await query("SELECT id FROM settings LIMIT 1");
  values.push(current.rows[0].id);
  const { rows } = await query(`UPDATE settings SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`, values);
  return NextResponse.json({ settings: rows[0] });
}
