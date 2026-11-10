import { test, expect } from "bun:test";
import { readFileSync } from "fs";
import {
  UNITS_PER_MM,
  EXPORT_MULTIPLIER,
  FORMATS,
  FACE_LABELS,
  getFormat,
  mmToPx,
  mmToPt,
  exportPixelSize,
  isOutsideSafe,
  SERIALIZE_PROPS,
  PALETTE,
} from "../lib/designFormats.js";
import { FONTS, mapPageFonts } from "../lib/designFonts.js";
import { formatPhoneFR, designInfo, TEMPLATES, blankPages, templatesFor } from "../lib/designTemplates.js";
import {
  parseDesignCreate,
  parseDesignPatch,
  MAX_PAGES_BYTES,
  MAX_THUMBNAIL_CHARS,
  NAME_MAX,
} from "../lib/designFields.js";

// --- Formats -----------------------------------------------------------------

test("carte : tailles, coupe et zone de sécurité", () => {
  const f = getFormat("CARTE");
  expect(f.orientation).toBe("paysage");
  expect(f.faces).toBe(2);
  expect(f.trimMm).toEqual({ w: 85, h: 55 });
  expect(f.bleedMm).toEqual({ w: 88, h: 58 });
  expect(f.safeMm).toEqual({ w: 82, h: 52 });
  expect(f.canvas).toEqual({ w: 880, h: 580 });
  expect(f.trimRect).toEqual({ x: 15, y: 15, w: 850, h: 550 });
  expect(f.safeRect).toEqual({ x: 30, y: 30, w: 820, h: 520 });
});

test("A5 et A4 : tailles avec fond perdu", () => {
  expect(getFormat("A5").bleedMm).toEqual({ w: 151, h: 213 });
  expect(getFormat("A5").safeMm).toEqual({ w: 145, h: 207 });
  expect(getFormat("A4").bleedMm).toEqual({ w: 213, h: 300 });
  expect(getFormat("A4").safeMm).toEqual({ w: 207, h: 294 });
  expect(getFormat("A4").faces).toBe(1);
  expect(getFormat("A4").canvas).toEqual({ w: 2130, h: 3000 });
});

test("conversions : carte 1039 × 685 px à 300 dpi, 249,4 × 164,4 pt", () => {
  const f = getFormat("CARTE");
  expect(exportPixelSize(f)).toEqual({ w: 1039, h: 685 });
  expect(mmToPx(88)).toBe(1039);
  expect(mmToPx(58)).toBe(685);
  expect(mmToPx(25.4, 72)).toBe(72);
  expect(mmToPt(88)).toBeCloseTo(249.4, 1);
  expect(mmToPt(58)).toBeCloseTo(164.4, 1);
  expect(EXPORT_MULTIPLIER).toBeCloseTo(1.1811, 4);
  expect(f.canvas.w * EXPORT_MULTIPLIER).toBeCloseTo(1039.37, 1);
  expect(UNITS_PER_MM).toBe(10);
});

test("orientation : permutation largeur / hauteur", () => {
  const p = getFormat("A5", "paysage");
  expect(p.orientation).toBe("paysage");
  expect(p.trimMm).toEqual({ w: 210, h: 148 });
  expect(p.bleedMm).toEqual({ w: 213, h: 151 });
  expect(p.canvas).toEqual({ w: 2130, h: 1510 });
  expect(p.safeRect).toEqual({ x: 30, y: 30, w: 2070, h: 1450 });
  expect(getFormat("A5", "portrait").canvas).toEqual({ w: 1510, h: 2130 });
  expect(getFormat("CARTE", "portrait").canvas).toEqual({ w: 580, h: 880 });
  expect(getFormat("A4", "bizarre").orientation).toBe("portrait");
  expect(getFormat("INCONNU")).toBe(null);
  expect(getFormat("toString")).toBe(null);
});

test("isOutsideSafe", () => {
  const f = getFormat("CARTE");
  expect(isOutsideSafe({ left: 30, top: 30, width: 820, height: 520 }, f)).toBe(false);
  expect(isOutsideSafe({ left: 100, top: 100, width: 50, height: 50 }, f)).toBe(false);
  expect(isOutsideSafe({ left: 29, top: 100, width: 50, height: 50 }, f)).toBe(true);
  expect(isOutsideSafe({ left: 100, top: 20, width: 50, height: 50 }, f)).toBe(true);
  expect(isOutsideSafe({ left: 820, top: 100, width: 40, height: 50 }, f)).toBe(true);
  expect(isOutsideSafe({ left: 100, top: 520, width: 50, height: 40 }, f)).toBe(true);
});

test("constantes partagées", () => {
  expect(FACE_LABELS).toEqual(["Recto", "Verso"]);
  expect(SERIALIZE_PROPS).toEqual(["abpRole", "abpLocked", "abpQrText"]);
  expect(PALETTE.length).toBe(10);
  expect(PALETTE.find((c) => c.name === "Rouille").hex).toBe("#a8481f");
  expect(Object.keys(FORMATS)).toEqual(["CARTE", "A5", "A4"]);
});

// --- Préremplissage ----------------------------------------------------------

test("formatPhoneFR", () => {
  expect(formatPhoneFR("33612345678")).toBe("06 12 34 56 78");
  expect(formatPhoneFR("0612345678")).toBe("06 12 34 56 78");
  expect(formatPhoneFR("447700900123")).toBe("447700900123");
  expect(formatPhoneFR("")).toBe("");
  expect(formatPhoneFR(null)).toBe("");
  expect(formatPhoneFR(undefined)).toBe("");
});

const SETTINGS = {
  business_name: "Aux Bonnes Pattes",
  contact_email: "aurore@auxbonnespattes.fr",
  whatsapp_number: "33612345678",
  service_area: "Viarmes et environs (15 km, au-delà sur devis)",
  rate_30: 15,
  rate_45: 18,
  rate_day: 10,
};

test("designInfo : réglages remplis", () => {
  const info = designInfo(SETTINGS, "https://www.auxbonnespattes.fr/");
  expect(info).toEqual({
    name: "Aux Bonnes Pattes",
    email: "aurore@auxbonnespattes.fr",
    phone: "06 12 34 56 78",
    area: "Viarmes et environs (15 km, au-delà sur devis)",
    instagram: "@auxbonnespattes",
    site: "auxbonnespattes.fr",
    siteUrl: "https://www.auxbonnespattes.fr",
    fromPrice: 15,
  });
});

test("designInfo : champs vides → textes d'exemple", () => {
  const info = designInfo({ business_name: "  ", contact_email: "", whatsapp_number: null }, "");
  expect(info.name).toBe("Nom de l'activité");
  expect(info.email).toBe("email@exemple.fr");
  expect(info.phone).toBe("06 00 00 00 00");
  expect(info.area).toBe("Commune et environs");
  expect(info.instagram).toBe("@auxbonnespattes");
  expect(info.site).toBe("site-internet.fr");
  expect(info.siteUrl).toBe("https://site-internet.fr");
  expect(info.fromPrice).toBe(null);
  expect(designInfo(null, undefined).name).toBe("Nom de l'activité");
});

// --- Modèles -----------------------------------------------------------------

const TYPES = ["Textbox", "Rect", "Circle", "Line", "Path", "Group", "Image"];
const ROLES = ["text", "shape", "photo", "icon", "qr"];

// Boîte englobante estimée (Fabric calcule la hauteur réelle d'un Textbox au
// chargement) : largeur moyenne d'un caractère ≈ 0,55 × corps, retour à la ligne.
function bounds(o) {
  if (o.type === "Textbox") {
    const charW = o.fontSize * (o.fontFamily === "Fraunces" ? 0.56 : 0.54);
    let lines = 0;
    for (const para of o.text.split("\n")) {
      lines += Math.max(1, Math.ceil((para.length * charW) / o.width));
    }
    return { left: o.left, top: o.top, width: o.width, height: lines * o.fontSize * (o.lineHeight || 1.16) };
  }
  if (o.type === "Circle") {
    return { left: o.left, top: o.top, width: o.radius * 2, height: o.radius * 2 };
  }
  return {
    left: o.left,
    top: o.top,
    width: o.width * (o.scaleX || 1),
    height: o.height * (o.scaleY || 1),
  };
}

const INFOS = [
  ["réglages remplis", designInfo(SETTINGS, "https://auxbonnespattes.fr")],
  ["réglages vides", designInfo({}, "")],
];

test("cinq modèles, identifiants attendus, formats connus", () => {
  expect(TEMPLATES.map((t) => t.id)).toEqual(["carte-carnet", "carte-rouille", "a5-balade", "a5-vacances", "a4-affiche"]);
  for (const t of TEMPLATES) {
    expect(FORMATS[t.format]).toBeDefined();
    expect(t.orientation).toBe(FORMATS[t.format].orientation);
    expect(typeof t.label).toBe("string");
    expect(t.description.length).toBeGreaterThan(10);
    expect(typeof t.build).toBe("function");
  }
  expect(templatesFor("CARTE").map((t) => t.id)).toEqual(["carte-carnet", "carte-rouille"]);
  expect(templatesFor("A5").map((t) => t.id)).toEqual(["a5-balade", "a5-vacances"]);
  expect(templatesFor("A4").map((t) => t.id)).toEqual(["a4-affiche"]);
  expect(templatesFor("XX")).toEqual([]);
});

for (const [label, info] of INFOS) {
  test(`modèles (${label}) : nombre de faces, objets valides, textes dans la zone de sécurité`, () => {
    for (const t of TEMPLATES) {
      const fmt = getFormat(t.format, t.orientation);
      const pages = t.build(info);
      expect([t.id, pages.length]).toEqual([t.id, fmt.faces]);
      // JSON pur, rechargeable.
      expect(JSON.parse(JSON.stringify(pages))).toEqual(pages);
      for (const [i, page] of pages.entries()) {
        expect(page.version).toBe("6");
        expect(page.background).toMatch(/^#[0-9a-f]{6}$/);
        expect(page.objects.length).toBeGreaterThan(3);
        for (const o of page.objects) {
          const where = `${t.id} face ${i} ${o.type} ${o.text || o.abpRole}`;
          expect([where, TYPES.includes(o.type)]).toEqual([where, true]);
          expect([where, ROLES.includes(o.abpRole)]).toEqual([where, true]);
          expect([where, o.originX, o.originY]).toEqual([where, "left", "top"]);
          const b = bounds(o);
          // Rien ne dépasse le fond perdu.
          expect([where, b.left >= 0 && b.top >= 0]).toEqual([where, true]);
          expect([where, b.left + b.width <= fmt.canvas.w + 0.01]).toEqual([where, true]);
          expect([where, b.top + b.height <= fmt.canvas.h + 0.01]).toEqual([where, true]);
          if (["text", "icon", "qr"].includes(o.abpRole)) {
            expect([where, isOutsideSafe(b, fmt)]).toEqual([where, false]);
          }
          if (o.type === "Textbox") {
            expect([where, ["Fraunces", "Atkinson Hyperlegible"].includes(o.fontFamily)]).toEqual([where, true]);
            for (const k of ["left", "top", "width", "fontSize", "fontWeight"]) {
              expect([where, k, typeof o[k]]).toEqual([where, k, "number"]);
            }
            expect([where, typeof o.text, typeof o.fill, typeof o.textAlign]).toEqual([where, "string", "string", "string"]);
            expect(o.text.trim().length).toBeGreaterThan(0);
          }
          if (o.abpRole === "qr") {
            expect(o.type).toBe("Rect");
            expect(o.abpQrText).toBe(info.siteUrl);
            expect(o.width).toBe(o.height);
          }
          if (o.abpRole === "photo") {
            expect(o.type).toBe("Rect");
            expect(o.fill).toBe("#efe7da");
          }
        }
      }
    }
  });
}

test("modèles : contenus de la spec et préremplissage", () => {
  const info = designInfo(SETTINGS, "https://auxbonnespattes.fr");
  const texts = (id) =>
    TEMPLATES.find((t) => t.id === id)
      .build(info)
      .flatMap((p) => p.objects)
      .filter((o) => o.type === "Textbox")
      .map((o) => o.text)
      .join("\n");
  const roles = (id) =>
    TEMPLATES.find((t) => t.id === id)
      .build(info)
      .map((p) => p.objects.map((o) => o.abpRole));

  // Carnet : nom + empreinte au recto, coordonnées + QR au verso.
  expect(roles("carte-carnet")[0]).toContain("icon");
  expect(roles("carte-carnet")[1]).toContain("qr");
  expect(texts("carte-carnet")).toContain("Aux Bonnes Pattes");
  expect(texts("carte-carnet")).toContain("06 12 34 56 78");
  expect(texts("carte-carnet")).toContain("aurore@auxbonnespattes.fr");
  // Rouille : recto aplat rouille, nom en papier.
  const rouille = TEMPLATES.find((t) => t.id === "carte-rouille").build(info);
  expect(rouille[0].background).toBe("#a8481f");
  expect(rouille[0].objects.find((o) => o.text === "Aux Bonnes Pattes").fill).toBe("#f7f2ea");
  // Balade : photo, tarif, QR.
  expect(roles("a5-balade")[0]).toContain("photo");
  expect(roles("a5-balade").flat()).toContain("qr");
  expect(texts("a5-balade")).toContain("15 €");
  expect(texts("a5-balade")).toContain("@auxbonnespattes");
  // Vacances : message.
  expect(texts("a5-vacances")).toContain("Vous partez ?");
  expect(texts("a5-vacances")).toContain("Je garde vos compagnons");
  // Affiche : tarif et zone.
  expect(texts("a4-affiche")).toContain("À partir de 15 €");
  expect(texts("a4-affiche")).toContain("Viarmes");
  // Sans tarif : pas de « 0 € » ni « null ».
  const vide = TEMPLATES.flatMap((t) => t.build(designInfo({}, ""))).flatMap((p) => p.objects);
  for (const o of vide.filter((x) => x.type === "Textbox")) {
    expect(o.text).not.toContain("null");
    expect(o.text).not.toContain("undefined");
  }
});

test("modèles : fonds sur papier, empreinte mise à l'échelle", () => {
  const info = designInfo(SETTINGS, "https://auxbonnespattes.fr");
  const paws = TEMPLATES.flatMap((t) => t.build(info))
    .flatMap((p) => p.objects)
    .filter((o) => o.type === "Path");
  expect(paws.length).toBeGreaterThanOrEqual(5);
  for (const p of paws) {
    expect(p.abpRole).toBe("icon");
    expect(p.scaleX).toBe(p.scaleY);
    expect(p.scaleX).toBeGreaterThan(1);
    expect(p.path.startsWith("M")).toBe(true);
  }
});

test("blankPages", () => {
  expect(blankPages("CARTE")).toEqual([
    { version: "6", background: "#f7f2ea", objects: [] },
    { version: "6", background: "#f7f2ea", objects: [] },
  ]);
  expect(blankPages("A4").length).toBe(1);
  expect(blankPages("XX")).toEqual([]);
  const pages = blankPages("A5");
  pages[0].objects.push(1);
  expect(pages[1].objects).toEqual([]);
});

const SOURCES = ["lib/designTemplates.js", "lib/designFormats.js", "lib/designFonts.js", "lib/designFields.js"];
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const PHONE = /0[1-9](?:[ .]?\d\d){4}/g;

test("sources : aucun emoji, aucun numéro en dur hors exemple", () => {
  for (const f of SOURCES) {
    const src = readFileSync(f, "utf8");
    expect([f, EMOJI.test(src)]).toEqual([f, false]);
    const phones = (src.match(PHONE) || []).filter((p) => p !== "06 00 00 00 00");
    expect([f, phones]).toEqual([f, []]);
  }
});

// --- Polices -----------------------------------------------------------------

test("FONTS", () => {
  expect(FONTS.map((f) => f.key)).toEqual(["Fraunces", "Atkinson Hyperlegible"]);
  expect(FONTS.map((f) => f.cssVar)).toEqual(["--font-fraunces", "--font-atkinson"]);
});

test("mapPageFonts : récursif, pur, styles par caractère", () => {
  const page = {
    version: "6",
    background: "#f7f2ea",
    objects: [
      { type: "Textbox", fontFamily: "Fraunces", text: "a" },
      { type: "Rect", fill: "#000" },
      {
        type: "Group",
        objects: [
          { type: "Textbox", fontFamily: "Atkinson Hyperlegible", styles: [{ start: 0, end: 1, style: { fontFamily: "Fraunces" } }] },
          { type: "Group", objects: [{ type: "Textbox", fontFamily: "Fraunces" }] },
        ],
      },
    ],
  };
  const before = JSON.stringify(page);
  const out = mapPageFonts(page, (n) => `X-${n}`);
  expect(JSON.stringify(page)).toBe(before);
  expect(out.background).toBe("#f7f2ea");
  expect(out.objects[0].fontFamily).toBe("X-Fraunces");
  expect(out.objects[1]).toEqual({ type: "Rect", fill: "#000" });
  expect(out.objects[1].fontFamily).toBeUndefined();
  expect(out.objects[2].objects[0].fontFamily).toBe("X-Atkinson Hyperlegible");
  expect(out.objects[2].objects[0].styles[0].style.fontFamily).toBe("X-Fraunces");
  expect(out.objects[2].objects[1].objects[0].fontFamily).toBe("X-Fraunces");
  // Aller-retour sur un modèle.
  const tpl = TEMPLATES[0].build(designInfo(SETTINGS, ""))[0];
  const back = mapPageFonts(mapPageFonts(tpl, (n) => `rt:${n}`), (n) => n.replace(/^rt:/, ""));
  expect(back).toEqual(tpl);
});

test("designFonts : aucun accès à document au chargement", async () => {
  expect(typeof globalThis.document).toBe("undefined");
  const mod = await import("../lib/designFonts.js");
  expect(typeof mod.browserFontResolver).toBe("function");
  expect(await mod.ensureFontsLoaded()).toBe(false);
});

// --- Validation --------------------------------------------------------------

test("parseDesignCreate : valeurs par défaut", () => {
  expect(parseDesignCreate({ format: "CARTE" })).toEqual({
    value: { name: "Sans titre", format: "CARTE", orientation: "paysage", templateId: null },
  });
  expect(parseDesignCreate({ format: "A5", name: "  Flyer   printemps " })).toEqual({
    value: { name: "Flyer printemps", format: "A5", orientation: "portrait", templateId: null },
  });
  expect(parseDesignCreate({ format: "A5", orientation: "paysage", templateId: "" }).value.orientation).toBe("paysage");
});

test("parseDesignCreate : modèle", () => {
  expect(parseDesignCreate({ format: "A5", templateId: "a5-balade", name: "Balade" }).value).toEqual({
    name: "Balade",
    format: "A5",
    orientation: "portrait",
    templateId: "a5-balade",
  });
  // L'orientation suit celle du modèle.
  expect(parseDesignCreate({ format: "A5", orientation: "paysage", templateId: "a5-balade" }).value.orientation).toBe(
    "portrait",
  );
  expect(parseDesignCreate({ format: "A5", templateId: "carte-carnet" }).error).toBeDefined();
  expect(parseDesignCreate({ format: "A5", templateId: "inconnu" }).error).toBeDefined();
  expect(parseDesignCreate({ format: "A5", templateId: 3 }).error).toBeDefined();
});

test("parseDesignCreate : erreurs", () => {
  expect(parseDesignCreate(null).error).toBeDefined();
  expect(parseDesignCreate([]).error).toBeDefined();
  expect(parseDesignCreate({}).error).toBeDefined();
  expect(parseDesignCreate({ format: "A3" }).error).toBeDefined();
  expect(parseDesignCreate({ format: "toString" }).error).toBeDefined();
  expect(parseDesignCreate({ format: "A4", orientation: "diagonale" }).error).toBeDefined();
  expect(parseDesignCreate({ format: "A4", name: 12 }).error).toBeDefined();
  expect(parseDesignCreate({ format: "A4", name: "x".repeat(NAME_MAX + 1) }).error).toBeDefined();
  expect(parseDesignCreate({ format: "A4", name: "x".repeat(NAME_MAX) }).value.name.length).toBe(NAME_MAX);
});

const PAGE = { version: "6", background: "#f7f2ea", objects: [] };

test("parseDesignPatch : champs valides", () => {
  expect(parseDesignPatch({ name: " Carte " })).toEqual({ value: { name: "Carte" } });
  expect(parseDesignPatch({ pages: [PAGE, PAGE] })).toEqual({ value: { pages: [PAGE, PAGE] } });
  const thumb = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
  expect(parseDesignPatch({ thumbnail: thumb })).toEqual({ value: { thumbnail: thumb } });
  expect(parseDesignPatch({ thumbnail: "data:image/png;base64,iVBORw0KGgo=" }).value).toBeDefined();
  expect(parseDesignPatch({ thumbnail: null })).toEqual({ value: { thumbnail: null } });
  const all = parseDesignPatch({ name: "A", pages: [PAGE], thumbnail: thumb, autre: 1 });
  expect(Object.keys(all.value).sort()).toEqual(["name", "pages", "thumbnail"]);
  const tpl = TEMPLATES[2].build(designInfo(SETTINGS, ""));
  expect(parseDesignPatch({ pages: tpl }).value.pages).toBe(tpl);
});

test("parseDesignPatch : erreurs", () => {
  expect(parseDesignPatch(null).error).toBeDefined();
  expect(parseDesignPatch({}).error).toBe("Rien à enregistrer.");
  expect(parseDesignPatch({ name: "" }).error).toBeDefined();
  expect(parseDesignPatch({ name: "x".repeat(NAME_MAX + 1) }).error).toBeDefined();
  expect(parseDesignPatch({ pages: [] }).error).toBeDefined();
  expect(parseDesignPatch({ pages: [PAGE, PAGE, PAGE] }).error).toBeDefined();
  expect(parseDesignPatch({ pages: PAGE }).error).toBeDefined();
  expect(parseDesignPatch({ pages: [{ objects: "non" }] }).error).toBeDefined();
  expect(parseDesignPatch({ pages: [null] }).error).toBeDefined();
  expect(parseDesignPatch({ thumbnail: "https://exemple.fr/a.jpg" }).error).toBeDefined();
  expect(parseDesignPatch({ thumbnail: "data:image/svg+xml;base64,PHN2Zz4=" }).error).toBeDefined();
  expect(parseDesignPatch({ thumbnail: "data:image/jpeg;base64,abc<script>" }).error).toBeDefined();
  expect(parseDesignPatch({ thumbnail: 42 }).error).toBeDefined();
});

test("parseDesignPatch : limites de taille", () => {
  const big = { ...PAGE, objects: [{ type: "Rect", note: "é".repeat(MAX_PAGES_BYTES / 2) }] };
  const r = parseDesignPatch({ pages: [big] });
  expect(r.error).toContain("2 Mo");
  const ok = { ...PAGE, objects: [{ type: "Rect", note: "a".repeat(MAX_PAGES_BYTES - 200) }] };
  expect(parseDesignPatch({ pages: [ok] }).value).toBeDefined();
  const thumb = "data:image/jpeg;base64," + "A".repeat(MAX_THUMBNAIL_CHARS);
  expect(parseDesignPatch({ thumbnail: thumb }).error).toBeDefined();
  const thumbOk = "data:image/jpeg;base64," + "A".repeat(MAX_THUMBNAIL_CHARS - 100);
  expect(parseDesignPatch({ thumbnail: thumbOk }).value).toBeDefined();
});
