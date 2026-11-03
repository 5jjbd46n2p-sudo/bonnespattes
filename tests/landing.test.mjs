import { test, expect } from "bun:test";
import { readFileSync, readdirSync } from "fs";
import { priceRows, fromPrice, normalizeWhatsapp, whatsappHref, WHATSAPP_MESSAGE } from "../lib/landing.js";

test("tarifs : lignes vides, nulles ou invalides masquées", () => {
  const rows = priceRows({ rate_30: 15, rate_45: "", rate_60: null, rate_day: "abc" });
  expect(rows.map((r) => r.key)).toEqual(["rate_30"]);
  expect(rows[0].amount).toBe(15);
});

test("tarifs : ordre et journée", () => {
  const rows = priceRows({ rate_30: "15", rate_45: 18, rate_60: 22, rate_day: 40 });
  expect(rows.map((r) => r.key)).toEqual(["rate_30", "rate_45", "rate_60", "rate_day"]);
  expect(rows[3].label).toBe("Garde à domicile, la journée");
});

test("fromPrice : minimum des visites, journée ignorée, null si rien", () => {
  expect(fromPrice(priceRows({ rate_30: 15, rate_45: 18, rate_day: 10 }))).toBe(15);
  expect(fromPrice(priceRows({ rate_day: 40 }))).toBe(null);
  expect(fromPrice([])).toBe(null);
});

test("normalizeWhatsapp", () => {
  expect(normalizeWhatsapp("06 12 34 56 78")).toEqual({ value: "33612345678" });
  expect(normalizeWhatsapp("+33 6 12 34 56 78")).toEqual({ value: "33612345678" });
  expect(normalizeWhatsapp("+33.6.12.34.56.78")).toEqual({ value: "33612345678" });
  expect(normalizeWhatsapp("")).toEqual({ value: null });
  expect(normalizeWhatsapp(null)).toEqual({ value: null });
  expect(normalizeWhatsapp("abc")).toEqual({ error: "Numéro WhatsApp invalide." });
  expect(normalizeWhatsapp("123")).toEqual({ error: "Numéro WhatsApp invalide." });
});

test("whatsappHref : seulement si numéro, message encodé", () => {
  expect(whatsappHref(null)).toBe(null);
  expect(whatsappHref("")).toBe(null);
  const href = whatsappHref("33612345678");
  expect(href.startsWith("https://wa.me/33612345678?text=")).toBe(true);
  expect(href).toContain("Bonjour%20Aurore");
  expect(decodeURIComponent(href.split("text=")[1])).toBe(WHATSAPP_MESSAGE);
});

const files = ["app/page.js", ...readdirSync("components/landing").map((f) => `components/landing/${f}`)];
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const PHONE = /0[1-9](?:[ .]?\d\d){4}/;

test("page : aucun emoji ni numéro de téléphone", () => {
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    expect([f, EMOJI.test(src)]).toEqual([f, false]);
    expect([f, PHONE.test(src)]).toEqual([f, false]);
  }
});

test("formulaire : tous les champs actuels conservés", () => {
  const src = readFileSync("components/landing/LeadForm.jsx", "utf8");
  for (const n of ["name", "email", "phone", "commune", "animals", "service", "message", "referralCode", "website"]) {
    expect([n, src.includes(`name="${n}"`)]).toEqual([n, true]);
  }
  expect(src).toContain("DEVIS");
});

test("page : un seul h1 et nouvelle accroche", () => {
  const all = files.map((f) => readFileSync(f, "utf8")).join("\n");
  expect((all.match(/<h1[\s>]/g) || []).length).toBe(1);
  expect(readFileSync("app/page.js", "utf8")).toContain("Visites et balades pour vos animaux, à Viarmes et autour.");
});
