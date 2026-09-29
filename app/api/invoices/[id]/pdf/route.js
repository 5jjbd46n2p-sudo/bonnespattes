import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatEUR, formatDateFR } from "@/lib/utils";
import { isUuid } from "@/lib/api";

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Non autorisé.", { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return new Response("Facture introuvable.", { status: 404 });

  const invRes = await query(
    `SELECT i.*, c.first_name, c.last_name, c.address, c.email AS client_email
     FROM invoices i JOIN clients c ON c.id = i.client_id WHERE i.id = $1`,
    [id]
  );
  const invoice = invRes.rows[0];
  if (!invoice) return new Response("Facture introuvable.", { status: 404 });
  // Un client ne voit que ses factures émises (ni brouillon ni facture de test)
  if (
    user.role === "CLIENT" &&
    (invoice.client_id !== user.client_id || invoice.is_test || invoice.status === "BROUILLON")
  ) {
    return new Response("Facture introuvable.", { status: 404 });
  }
  const itemsRes = await query("SELECT * FROM invoice_items WHERE invoice_id = $1", [id]);
  let cancelledNumber = null;
  if (invoice.credit_note_of) {
    const o = await query("SELECT number FROM invoices WHERE id = $1", [invoice.credit_note_of]);
    cancelledNumber = o.rows[0]?.number || null;
  }
  const paymentsRes = await query(
    "SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE invoice_id = $1",
    [id]
  );
  const paidAmount = Number(paymentsRes.rows[0].total);
  const settingsRes = await query("SELECT * FROM settings LIMIT 1");
  const settings = settingsRes.rows[0];

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.16, 0.16, 0.15);
  const muted = rgb(0.45, 0.45, 0.42);
  const accent = rgb(0.62, 0.42, 0.16);

  let y = 800;
  const left = 50;
  const right = 545;

  const drawText = (text, x, yy, opts = {}) => {
    page.drawText(String(text ?? ""), {
      x,
      y: yy,
      size: opts.size || 10,
      font: opts.bold ? bold : font,
      color: opts.color || ink,
    });
  };

  drawText(settings.business_name || "Mon activité de pet sitting", left, y, { size: 18, bold: true });
  y -= 18;
  if (settings.business_address) {
    drawText(settings.business_address, left, y, { size: 9, color: muted });
    y -= 12;
  }
  if (settings.siret) {
    drawText(`SIRET : ${settings.siret}`, left, y, { size: 9, color: muted });
    y -= 12;
  }
  if (settings.tva_number) {
    drawText(`N° TVA : ${settings.tva_number}`, left, y, { size: 9, color: muted });
    y -= 12;
  }

  // Titre facture + numéro, aligné à droite
  drawText(`${invoice.credit_note_of ? "AVOIR" : "FACTURE"} ${invoice.number}`, 350, 800, { size: 14, bold: true, color: accent });
  if (cancelledNumber) {
    drawText(`Annule la facture ${cancelledNumber}`, 350, 740, { size: 9, bold: true, color: muted });
  }
  drawText(`Date d'émission : ${formatDateFR(invoice.issue_date)}`, 350, 782, { size: 9, color: muted });
  if (invoice.is_test) {
    drawText("FACTURE DE TEST - sans valeur", 350, 754, { size: 10, bold: true, color: accent });
  }
  if (invoice.due_date) {
    drawText(`Échéance : ${formatDateFR(invoice.due_date)}`, 350, 768, { size: 9, color: muted });
  }

  y -= 30;
  drawText("Facturé à :", left, y, { size: 10, bold: true });
  y -= 14;
  drawText(`${invoice.first_name} ${invoice.last_name}`, left, y, { size: 10 });
  y -= 13;
  if (invoice.address) {
    drawText(invoice.address, left, y, { size: 9, color: muted });
    y -= 13;
  }
  if (invoice.client_email) {
    drawText(invoice.client_email, left, y, { size: 9, color: muted });
    y -= 13;
  }

  y -= 20;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: rgb(0.85, 0.82, 0.75) });
  y -= 18;

  drawText("Description", left, y, { size: 9, bold: true, color: muted });
  drawText("Qté", 360, y, { size: 9, bold: true, color: muted });
  drawText("Prix unit.", 410, y, { size: 9, bold: true, color: muted });
  drawText("Total", 490, y, { size: 9, bold: true, color: muted });
  y -= 14;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: rgb(0.85, 0.82, 0.75) });
  y -= 16;

  for (const it of itemsRes.rows) {
    // Ligne offerte : 0,00 € et mention « offerte » (une ligne « Déplacement » s'affiche telle quelle)
    const isFree = Number(it.total) === 0;
    const desc = isFree && !/offerte/i.test(it.description || "") ? `${it.description} — offerte` : it.description;
    drawText(desc, left, y, { size: 10, color: isFree ? muted : ink });
    drawText(String(it.quantity), 360, y, { size: 10 });
    drawText(formatEUR(isFree ? 0 : it.unit_price), 410, y, { size: 10 });
    drawText(formatEUR(isFree ? 0 : it.total), 490, y, { size: 10 });
    y -= 18;
    if (y < 150) {
      y = 800;
      pdfDoc.addPage([595.28, 841.89]);
    }
  }

  y -= 10;
  page.drawLine({ start: { x: 350, y }, end: { x: right, y }, thickness: 0.5, color: rgb(0.85, 0.82, 0.75) });
  y -= 16;
  drawText("Total HT", 410, y, { size: 10 });
  drawText(formatEUR(invoice.total_ht), 490, y, { size: 10 });
  y -= 16;
  drawText(`TVA (${invoice.tva_rate}%)`, 410, y, { size: 10 });
  drawText(formatEUR(invoice.total_tva), 490, y, { size: 10 });
  y -= 16;
  drawText("Total TTC", 410, y, { size: 11, bold: true });
  drawText(formatEUR(invoice.total_ttc), 490, y, { size: 11, bold: true });

  if (paidAmount > 0) {
    y -= 16;
    drawText("Déjà réglé (dont acompte)", 410, y, { size: 9, color: muted });
    drawText(formatEUR(paidAmount), 490, y, { size: 9, color: muted });
    y -= 16;
    drawText("Net à payer", 410, y, { size: 11, bold: true });
    drawText(formatEUR(Number(invoice.total_ttc) - paidAmount), 490, y, { size: 11, bold: true });
  }

  y -= 40;
  if (settings.iban) {
    drawText(`Coordonnées bancaires (IBAN) : ${settings.iban}`, left, y, { size: 9, color: muted });
    y -= 14;
  }
  if (invoice.notes) {
    drawText(invoice.notes, left, y, { size: 9, color: muted });
  }

  const bytes = await pdfDoc.save();
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${String(invoice.number).replace(/[^A-Za-z0-9_-]/g, "")}.pdf"`,
      // Document financier : jamais conservé en cache (navigateur, proxy)
      "Cache-Control": "private, no-store",
    },
  });
}
