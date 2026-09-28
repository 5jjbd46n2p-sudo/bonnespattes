import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

function csvEscape(v) {
  let s = String(v ?? "");
  // Protection contre l'injection de formule (CSV injection) : si Excel/Sheets
  // ouvre ce fichier, un champ commençant par =, +, -, @ ou une tabulation
  // pourrait être interprété comme une formule. On neutralise en préfixant
  // d'une apostrophe, sans changer la valeur affichée à la lecture.
  if (/^[=+\-@\t]/.test(s)) {
    s = `'${s}`;
  }
  if (s.includes(";") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req) {
  const admin = await requireAdmin();
  if (!admin) return new Response("Non autorisé.", { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const conditions = [];
  const values = [];
  let i = 1;
  if (from) {
    conditions.push(`i.issue_date >= $${i++}`);
    values.push(from);
  }
  if (to) {
    conditions.push(`i.issue_date <= $${i++}`);
    values.push(to);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const { rows } = await query(
    `SELECT i.number, i.issue_date, i.due_date, i.status, c.first_name, c.last_name,
       i.total_ht, i.tva_rate, i.total_tva, i.total_ttc,
       (SELECT COALESCE(SUM(amount),0) FROM payments pay WHERE pay.invoice_id = i.id) AS paid_amount,
       (SELECT STRING_AGG(date::text || ' (' || method || ')', ', ') FROM payments pay WHERE pay.invoice_id = i.id) AS payment_details
     FROM invoices i JOIN clients c ON c.id = i.client_id
     ${where}
     ORDER BY i.issue_date ASC`,
    values
  );

  const header = [
    "Numero",
    "Date emission",
    "Echeance",
    "Statut",
    "Client",
    "Total HT",
    "Taux TVA",
    "Total TVA",
    "Total TTC",
    "Montant paye",
    "Solde",
    "Details paiements",
  ];

  const lines = [header.join(";")];
  for (const r of rows) {
    const solde = Number(r.total_ttc) - Number(r.paid_amount);
    lines.push(
      [
        r.number,
        r.issue_date?.toISOString?.().slice(0, 10) || r.issue_date,
        r.due_date ? r.due_date.toISOString?.().slice(0, 10) || r.due_date : "",
        r.status,
        `${r.first_name} ${r.last_name}`,
        Number(r.total_ht).toFixed(2),
        r.tva_rate,
        Number(r.total_tva).toFixed(2),
        Number(r.total_ttc).toFixed(2),
        Number(r.paid_amount).toFixed(2),
        solde.toFixed(2),
        r.payment_details || "",
      ]
        .map(csvEscape)
        .join(";")
    );
  }

  const csv = "\uFEFF" + lines.join("\n"); // BOM pour Excel
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="export-comptable.csv"`,
    },
  });
}
