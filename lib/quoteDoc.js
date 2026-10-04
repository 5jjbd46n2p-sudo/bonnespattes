import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatEUR, formatDateFR } from "@/lib/utils";

export const QUOTE_VALIDITY_DAYS = 30;

function durationLabel(min) {
  if (!min || min <= 0) return "";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

// Lignes du devis à partir de visites planifiées (champs : date_fr, pet_name, minutes,
// price, travel_fee, is_free, discount_percent).
export function quoteItemsFromVisits(visits) {
  const items = [];
  for (const v of visits) {
    const dur = durationLabel(Number(v.minutes));
    const label = `Visite du ${v.date_fr} — ${v.pet_name}${dur ? ` (${dur})` : ""}`;
    if (v.is_free) {
      items.push({ description: `${label} — offerte`, unitPrice: 0 });
      continue;
    }
    const disc = Number(v.discount_percent) || 0;
    items.push({
      description: disc > 0 ? `${label} — remise première visite −${disc} %` : label,
      unitPrice: Number(v.price) || 0,
    });
    if (Number(v.travel_fee) > 0) {
      items.push({ description: `Déplacement — visite du ${v.date_fr}`, unitPrice: Number(v.travel_fee) });
    }
  }
  return items;
}

export async function buildQuotePdf({ quote, items, client, settings }) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.16, 0.16, 0.15);
  const muted = rgb(0.45, 0.45, 0.42);
  const accent = rgb(0.62, 0.42, 0.16);
  const line = rgb(0.85, 0.82, 0.75);
  const left = 50;
  const right = 545;
  let y = 800;

  const text = (t, x, yy, o = {}) =>
    page.drawText(String(t ?? ""), { x, y: yy, size: o.size || 10, font: o.bold ? bold : font, color: o.color || ink });

  text(settings.business_name || "Mon activité de pet sitting", left, y, { size: 18, bold: true });
  y -= 18;
  for (const [label, val] of [
    ["", settings.business_address],
    ["SIRET : ", settings.siret],
    ["N° TVA : ", settings.tva_number],
  ]) {
    if (val) {
      text(`${label}${val}`, left, y, { size: 9, color: muted });
      y -= 12;
    }
  }

  text(`DEVIS ${quote.number}`, 350, 800, { size: 14, bold: true, color: accent });
  text(`Date : ${formatDateFR(quote.issue_date)}`, 350, 782, { size: 9, color: muted });
  if (quote.valid_until) text(`Valable jusqu'au : ${formatDateFR(quote.valid_until)}`, 350, 768, { size: 9, color: muted });

  y -= 30;
  text("Destinataire :", left, y, { bold: true });
  y -= 14;
  text(`${client.first_name} ${client.last_name}`.trim(), left, y);
  y -= 13;
  if (client.address) {
    text(client.address, left, y, { size: 9, color: muted });
    y -= 13;
  }
  if (client.email) {
    text(client.email, left, y, { size: 9, color: muted });
    y -= 13;
  }

  y -= 20;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: line });
  y -= 18;
  text("Prestation", left, y, { size: 9, bold: true, color: muted });
  text("Qté", 360, y, { size: 9, bold: true, color: muted });
  text("Prix unit.", 410, y, { size: 9, bold: true, color: muted });
  text("Total", 490, y, { size: 9, bold: true, color: muted });
  y -= 14;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: line });
  y -= 16;

  for (const it of items) {
    const free = Number(it.total) === 0;
    const desc = String(it.description || "");
    text(desc.length > 62 ? `${desc.slice(0, 61)}…` : desc, left, y, { color: free ? muted : ink });
    text(String(it.quantity), 360, y);
    text(formatEUR(it.unit_price), 410, y);
    text(formatEUR(it.total), 490, y);
    y -= 18;
    if (y < 150) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = 800;
    }
  }

  y -= 10;
  page.drawLine({ start: { x: 350, y }, end: { x: right, y }, thickness: 0.5, color: line });
  y -= 16;
  text("Total HT", 410, y);
  text(formatEUR(quote.total_ht), 490, y);
  y -= 16;
  text(`TVA (${quote.tva_rate}%)`, 410, y);
  text(formatEUR(quote.total_tva), 490, y);
  y -= 16;
  text("Total TTC", 410, y, { size: 11, bold: true });
  text(formatEUR(quote.total_ttc), 490, y, { size: 11, bold: true });
  if (Number(quote.tva_rate) === 0) {
    y -= 16;
    text("TVA non applicable, art. 293 B du CGI.", 350, y, { size: 8, color: muted });
  }

  // Saut de page si l'espace restant est insuffisant.
  const ensure = (needed) => {
    if (y - needed < 50) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = 800;
    }
  };
  // Coupe un texte en lignes qui tiennent dans la largeur (retours à la ligne conservés).
  const wrap = (str, size) => {
    const maxW = right - left;
    const out = [];
    for (const para of String(str).replace(/\r/g, "").split("\n")) {
      if (!para.trim()) {
        out.push("");
        continue;
      }
      let cur = "";
      for (const word of para.split(/\s+/)) {
        let w = word;
        // Mot plus long qu'une ligne : coupé au caractère
        while (font.widthOfTextAtSize(w, size) > maxW) {
          let n = w.length;
          while (n > 1 && font.widthOfTextAtSize(w.slice(0, n), size) > maxW) n--;
          if (cur) {
            out.push(cur);
            cur = "";
          }
          out.push(w.slice(0, n));
          w = w.slice(n);
        }
        const next = cur ? `${cur} ${w}` : w;
        if (font.widthOfTextAtSize(next, size) <= maxW) cur = next;
        else {
          out.push(cur);
          cur = w;
        }
      }
      out.push(cur);
    }
    return out;
  };

  y -= 36;
  if (quote.message) {
    for (const l of wrap(quote.message, 9)) {
      ensure(14);
      if (l) text(l, left, y, { size: 9, color: muted });
      y -= 12;
    }
    y -= 8;
  }
  ensure(120);
  text("Pour accepter ce devis, répondez « Bon pour accord » par e-mail ou par message.", left, y, { size: 9 });
  y -= 24;
  text("Date et signature du client, précédées de « Bon pour accord » :", left, y, { size: 9, color: muted });
  page.drawRectangle({ x: left, y: y - 70, width: 240, height: 60, borderColor: line, borderWidth: 0.7 });

  return pdfDoc.save();
}
