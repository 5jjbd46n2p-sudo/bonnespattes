import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/api";
import { audit } from "@/lib/audit";
import { loadInvoiceWithClient, buildInvoicePdf, invoiceFilename } from "@/lib/invoicePdf";
import { sendInvoiceEmail } from "@/lib/email";
import { formatEUR, formatDateFR } from "@/lib/utils";

// Envoi de la facture (ou de l'avoir) au client par e-mail, PDF en pièce jointe.
// Un brouillon envoyé devient « Envoyée » (facture émise). Les factures de test
// ne partent jamais chez un client.
export async function POST(_req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });

  const invoice = await loadInvoiceWithClient(id);
  if (!invoice) return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
  if (invoice.is_test) {
    return NextResponse.json({ error: "Une facture de test ne s'envoie pas au client." }, { status: 400 });
  }
  const to = String(invoice.client_email || "").trim();
  if (!to) return NextResponse.json({ error: "Ce client n'a pas d'adresse e-mail." }, { status: 400 });

  try {
    const [bytes, settingsRes, paidRes, accountRes] = await Promise.all([
      buildInvoicePdf(invoice),
      query("SELECT iban FROM settings LIMIT 1"),
      query("SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE invoice_id = $1", [id]),
      query("SELECT 1 FROM users WHERE client_id = $1 AND role = 'CLIENT' LIMIT 1", [invoice.client_id]),
    ]);
    const paid = Number(paidRes.rows[0].total);
    const due = Math.round((Number(invoice.total_ttc) - paid) * 100) / 100;
    const isCreditNote = Boolean(invoice.credit_note_of);
    await sendInvoiceEmail({
      to,
      clientName: `${invoice.first_name} ${invoice.last_name}`.trim(),
      number: invoice.number,
      isCreditNote,
      total: formatEUR(invoice.total_ttc),
      remaining: due > 0 ? formatEUR(due) : null,
      partlyPaid: paid > 0 && due > 0,
      dueDate: invoice.due_date && due > 0 ? formatDateFR(invoice.due_date) : null,
      hasIban: Boolean(settingsRes.rows[0]?.iban) && due > 0,
      inAccount: accountRes.rows.length > 0,
      pdfBase64: Buffer.from(bytes).toString("base64"),
      filename: invoiceFilename(invoice),
    });
    const { rows } = await query(
      `UPDATE invoices SET emailed_at = now(), emailed_to = $2,
              status = CASE WHEN status = 'BROUILLON' THEN 'ENVOYEE' ELSE status END
        WHERE id = $1 RETURNING status, emailed_at::text`,
      [id, to]
    );
    if (invoice.status === "BROUILLON" && rows[0]?.status !== "BROUILLON") {
      await audit(null, { actorId: admin.id, action: "invoice.issue", entity: "invoice", entityId: id, details: { number: invoice.number } });
    }
    return NextResponse.json({ ok: true, to, status: rows[0]?.status, emailedAt: rows[0]?.emailed_at });
  } catch (e) {
    console.error("/api/invoices/[id]/send :", e?.message);
    return NextResponse.json({ error: "Envoi impossible, réessaie dans un instant." }, { status: 500 });
  }
}
