import { test, expect, beforeEach } from "bun:test";

let sent;
globalThis.fetch = async (_url, opts) => {
  sent = JSON.parse(opts.body);
  return { ok: true, text: async () => "" };
};
process.env.RESEND_API_KEY = "test";
const { sendInvoiceEmail } = await import("../lib/email.js");

const base = {
  to: "christine@example.com", clientName: "Christine Loosen", number: "F0004", isCreditNote: false,
  total: "84,00 €", remaining: "84,00 €", partlyPaid: false, dueDate: "16 novembre 2026", hasIban: true,
  inAccount: true, pdfBase64: "QUJD", filename: "F0004.pdf",
};
beforeEach(() => { sent = null; });

test("facture à régler : montant, échéance, IBAN, espace client, PDF joint", async () => {
  await sendInvoiceEmail(base);
  expect(sent.subject).toBe("Votre facture F0004 - Aux Bonnes Pattes");
  expect(sent.html).toContain("Bonjour Christine");
  expect(sent.html).toContain("d'un montant de 84,00 €, à régler avant le 16 novembre 2026");
  expect(sent.html).toContain("coordonnées bancaires");
  expect(sent.html).toContain("espace client");
  expect(sent.attachments).toEqual([{ filename: "F0004.pdf", content: "QUJD" }]);
});

test("facture déjà réglée : pas d'échéance ni d'IBAN", async () => {
  await sendInvoiceEmail({ ...base, remaining: null, dueDate: null, hasIban: false });
  expect(sent.html).toContain("déjà réglée");
  expect(sent.html).not.toContain("coordonnées bancaires");
});

test("acompte versé : reste à régler", async () => {
  await sendInvoiceEmail({ ...base, remaining: "54,00 €", partlyPaid: true });
  expect(sent.html).toContain("(reste à régler : 54,00 €)");
});

test("avoir et client sans espace", async () => {
  await sendInvoiceEmail({ ...base, number: "F0005", isCreditNote: true, total: "-84,00 €", inAccount: false });
  expect(sent.subject).toBe("Votre avoir F0005 - Aux Bonnes Pattes");
  expect(sent.html).not.toContain("espace client");
});

test("nom avec balise : échappé", async () => {
  await sendInvoiceEmail({ ...base, clientName: "<b>Eve</b> X" });
  expect(sent.html).not.toContain("<b>Eve</b>");
});
