// Modèles de départ de l'onglet Conception et préremplissage depuis les Réglages.
// Logique pure (JSON Fabric v6 écrit à la main, sans importer fabric), testée
// par tests/design.test.mjs. Coordonnées en unités (10 unités = 1 mm), origine
// au coin du fond perdu ; textes, icônes et QR toujours dans la zone de sécurité.

import { FORMATS } from "./designFormats.js";
import { priceRows, fromPrice as cheapest } from "./landing.js";

const C = {
  papier: "#f7f2ea",
  lin: "#fffcf7",
  sable: "#efe7da",
  encre: "#1f1a15",
  pierre: "#6e655a",
  rouille: "#a8481f",
  mousse: "#4f6b3a",
  miel: "#d69a4e",
  blanc: "#ffffff",
};

const TITLE = "Fraunces";
const BODY = "Atkinson Hyperlegible";
const PAGE_VERSION = "6";

// ---------------------------------------------------------------------------
// Préremplissage
// ---------------------------------------------------------------------------

// "336…" (international, sans +) → "06 xx xx xx xx" ; autre valeur → chaîne d'origine ; vide → "".
export function formatPhoneFR(digits) {
  if (digits === null || digits === undefined) return "";
  const raw = String(digits).trim();
  if (!raw) return "";
  const compact = raw.replace(/[\s.\-()+]/g, "");
  let national = null;
  if (/^33[1-9]\d{8}$/.test(compact)) national = `0${compact.slice(2)}`;
  else if (/^0[1-9]\d{8}$/.test(compact)) national = compact;
  if (!national) return raw;
  return national.match(/\d\d/g).join(" ");
}

const EXAMPLES = {
  name: "Nom de l'activité",
  email: "email@exemple.fr",
  phone: "06 00 00 00 00",
  area: "Commune et environs",
  site: "site-internet.fr",
};

function clean(v) {
  return typeof v === "string" ? v.trim() : "";
}

// Informations affichées dans les modèles. Champ vide → texte d'exemple à remplacer.
export function designInfo(settings, appUrl) {
  const s = settings && typeof settings === "object" ? settings : {};
  let siteUrl = clean(appUrl).replace(/\/+$/, "");
  let site = "";
  if (siteUrl) {
    if (!/^https?:\/\//i.test(siteUrl)) siteUrl = `https://${siteUrl}`;
    site = siteUrl.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  } else {
    site = EXAMPLES.site;
    siteUrl = `https://${EXAMPLES.site}`;
  }
  const phone = formatPhoneFR(s.whatsapp_number);
  return {
    name: clean(s.business_name) || EXAMPLES.name,
    email: clean(s.contact_email) || EXAMPLES.email,
    phone: phone || EXAMPLES.phone,
    area: clean(s.service_area) || EXAMPLES.area,
    instagram: "@auxbonnespattes",
    site,
    siteUrl,
    fromPrice: cheapest(priceRows(s)),
    // Mention légale des imprimés distribués ; vide tant que le SIRET n'est pas renseigné.
    siret: clean(s.siret),
    // L'assurance n'est annoncée que si elle est décrite dans les Réglages.
    insured: clean(s.insurance_info) !== "",
  };
}

function euros(amount) {
  const n = Number(amount);
  const txt = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ",");
  return `${txt} €`;
}

// ---------------------------------------------------------------------------
// Briques JSON Fabric v6
// ---------------------------------------------------------------------------

// Taille de police : points → unités (1 pt ≈ 3,528 unités), au dixième.
function fs(points) {
  return Math.round(points * (25.4 / 72) * 10 * 10) / 10;
}

function text(t, o) {
  return {
    type: "Textbox",
    version: PAGE_VERSION,
    originX: "left",
    originY: "top",
    left: o.left,
    top: o.top,
    width: o.width,
    text: t,
    fontFamily: o.font || BODY,
    fontSize: fs(o.size),
    fontWeight: o.weight || (o.font === TITLE ? 600 : 400),
    fontStyle: o.italic ? "italic" : "normal",
    fill: o.fill || C.encre,
    textAlign: o.align || "left",
    lineHeight: o.lineHeight || 1.2,
    charSpacing: o.charSpacing || 0,
    angle: 0,
    opacity: 1,
    splitByGrapheme: false,
    abpRole: "text",
    abpLocked: false,
  };
}

function rect(o, role = "shape") {
  return {
    type: "Rect",
    version: PAGE_VERSION,
    originX: "left",
    originY: "top",
    left: o.left,
    top: o.top,
    width: o.width,
    height: o.height,
    fill: o.fill,
    stroke: null,
    strokeWidth: 0,
    rx: o.r || 0,
    ry: o.r || 0,
    angle: 0,
    opacity: 1,
    abpRole: role,
    abpLocked: false,
  };
}

function dot(o) {
  return {
    type: "Circle",
    version: PAGE_VERSION,
    originX: "left",
    originY: "top",
    left: o.left,
    top: o.top,
    radius: o.radius,
    fill: o.fill,
    stroke: null,
    strokeWidth: 0,
    angle: 0,
    opacity: 1,
    abpRole: "shape",
    abpLocked: false,
  };
}

// Emplacement photo : aplat sable que la photo d'Aurore viendra remplir.
function photoSlot(o) {
  return rect({ fill: C.sable, ...o }, "photo");
}

// Emplacement QR : remplacé par le vrai QR (même position, même taille) à l'ouverture.
function qr(o, info) {
  return { ...rect({ ...o, height: o.size, width: o.size, fill: C.blanc }, "qr"), abpQrText: info.siteUrl };
}

// QR vers le site avec une provenance (carte, flyer, affiche) : le bilan par canal
// du plan marketing distingue ainsi les supports.
function qrFrom(o, info, source) {
  return { ...qr(o, info), abpQrText: `${info.siteUrl}/?utm_source=${source}` };
}

// Empreinte de components/Logo.jsx (PawMark, viewBox 32 × 32), ovales convertis
// en arcs et coussinet en coordonnées absolues. Boîte englobante mesurée :
// x 3,133 → 28,867, y 3,117 → 28,4.
const PAW_PATH =
  "M7.746 16.671A2.9 3.8 -24 0 1 4.654 9.729A2.9 3.8 -24 0 1 7.746 16.671Z" +
  "M12.571 11.26A3.1 4.1 -8 0 1 11.429 3.14A3.1 4.1 -8 0 1 12.571 11.26Z" +
  "M19.429 11.26A3.1 4.1 8 0 1 20.571 3.14A3.1 4.1 8 0 1 19.429 11.26Z" +
  "M24.254 16.671A2.9 3.8 24 0 1 27.346 9.729A2.9 3.8 24 0 1 24.254 16.671Z" +
  "M16 14.6C13.1 14.6 11.4 16.9 10 19.2C8.7 21.3 6.7 22.4 6.7 24.8C6.7 26.9 8.4 28.4 10.5 28.4" +
  "C12.5 28.4 13.7 27.4 16 27.4C18.3 27.4 19.5 28.4 21.5 28.4C23.6 28.4 25.3 26.9 25.3 24.8" +
  "C25.3 22.4 23.3 21.3 22 19.2C20.6 16.9 18.9 14.6 16 14.6Z";
const PAW_W = 25.734;
const PAW_H = 25.283;

// size = largeur voulue en unités ; left/top = coin haut gauche de l'empreinte.
function paw(o) {
  const scale = Math.round((o.size / PAW_W) * 10000) / 10000;
  return {
    type: "Path",
    version: PAGE_VERSION,
    originX: "left",
    originY: "top",
    left: o.left,
    top: o.top,
    width: PAW_W,
    height: PAW_H,
    scaleX: scale,
    scaleY: scale,
    path: PAW_PATH,
    fill: o.fill || C.rouille,
    stroke: null,
    strokeWidth: 0,
    angle: 0,
    opacity: 1,
    abpRole: "icon",
    abpLocked: false,
  };
}

function page(background, objects) {
  return { version: PAGE_VERSION, background, objects };
}

function contactLines(info, keys) {
  return keys.map((k) => info[k]).join("\n");
}

function priceTexts(info) {
  if (info.fromPrice) {
    return { kicker: "À partir de", amount: euros(info.fromPrice), note: "la visite, devis gratuit" };
  }
  return { kicker: "Tarifs", amount: "Sur devis", note: "gratuit et sans engagement" };
}

// ---------------------------------------------------------------------------
// Carte de visite (paysage 880 × 580, zone de sécurité 30 → 850 × 30 → 550)
// ---------------------------------------------------------------------------

function carteCarnet(info) {
  const recto = page(C.papier, [
    paw({ left: 370, top: 95, size: 140 }),
    text(info.name, { left: 45, top: 270, width: 790, font: TITLE, size: 14, align: "center" }),
    rect({ left: 410, top: 352, width: 60, height: 4, fill: C.rouille }),
    text("Visites, balades et garde à domicile", {
      left: 45, top: 378, width: 790, size: 9, fill: C.pierre, align: "center",
    }),
    text("Aurore, ancienne assistante vétérinaire", {
      left: 45, top: 470, width: 790, size: 7.5, fill: C.mousse, align: "center", weight: 700,
    }),
  ]);
  const verso = page(C.papier, [
    rect({ left: 0, top: 0, width: 880, height: 22, fill: C.rouille }),
    paw({ left: 60, top: 62, size: 46 }),
    text(info.name, { left: 122, top: 62, width: 700, font: TITLE, size: 12 }),
    text(info.area, { left: 60, top: 130, width: 520, size: 7.5, fill: C.pierre }),
    rect({ left: 60, top: 212, width: 50, height: 3, fill: C.rouille }),
    text(contactLines(info, ["phone", "email", "site", "instagram"]), {
      left: 60, top: 240, width: 520, size: 8, lineHeight: 1.45,
    }),
    qr({ left: 620, top: 210, size: 200 }, info),
    text("Infos et tarifs", { left: 600, top: 425, width: 240, size: 6.5, fill: C.pierre, align: "center" }),
  ]);
  return [recto, verso];
}

function carteRouille(info) {
  const recto = page(C.rouille, [
    paw({ left: 385, top: 105, size: 110, fill: C.papier }),
    text(info.name, { left: 45, top: 270, width: 790, font: TITLE, size: 14, fill: C.papier, align: "center" }),
    text("Visites, balades et garde à domicile", {
      left: 45, top: 360, width: 790, size: 9, fill: C.sable, align: "center",
    }),
    rect({ left: 400, top: 440, width: 80, height: 3, fill: C.miel }),
    text("Aurore, ancienne assistante vétérinaire", {
      left: 45, top: 465, width: 790, size: 7.5, fill: C.sable, align: "center",
    }),
  ]);
  const verso = page(C.papier, [
    rect({ left: 0, top: 0, width: 220, height: 580, fill: C.rouille }),
    paw({ left: 67, top: 240, size: 100, fill: C.papier }),
    text(info.name, { left: 270, top: 60, width: 570, font: TITLE, size: 11 }),
    text("Aurore, ancienne assistante vétérinaire", { left: 270, top: 160, width: 570, size: 7.5, fill: C.pierre }),
    rect({ left: 270, top: 212, width: 50, height: 3, fill: C.rouille }),
    text(contactLines(info, ["phone", "email", "site", "instagram"]), {
      left: 270, top: 235, width: 570, size: 8, lineHeight: 1.45,
    }),
    text(info.area, { left: 270, top: 440, width: 570, size: 7, fill: C.mousse, weight: 700 }),
  ]);
  return [recto, verso];
}

// ---------------------------------------------------------------------------
// Flyer A5 (portrait 1510 × 2130, zone de sécurité 30 → 1480 × 30 → 2100)
// ---------------------------------------------------------------------------

const SERVICES = [
  ["Visites à domicile", "Repas, eau fraîche, câlins et litière, dans le calme de sa maison."],
  ["Balades", "Des sorties adaptées au rythme et au caractère de votre chien."],
  ["Garde chez Aurore", "À la journée, pour les compagnons qui n'aiment pas rester seuls."],
  ["Soins et traitements", "Ancienne assistante vétérinaire : médicaments donnés en toute confiance."],
];

function a5Balade(info) {
  const recto = page(C.papier, [
    photoSlot({ left: 0, top: 0, width: 1510, height: 1150 }),
    paw({ left: 90, top: 1225, size: 90 }),
    text("Vos compagnons entre de bonnes mains, en votre absence.", {
      left: 90, top: 1350, width: 1330, font: TITLE, size: 28, lineHeight: 1.1,
    }),
    text("Visites, balades et garde à domicile par Aurore, ancienne assistante vétérinaire.", {
      left: 90, top: 1720, width: 1330, size: 12, fill: C.pierre, lineHeight: 1.3,
    }),
    rect({ left: 0, top: 1940, width: 1510, height: 190, fill: C.rouille }),
    text(info.name, { left: 90, top: 1985, width: 800, font: TITLE, size: 14, fill: C.papier }),
    text(info.site, { left: 900, top: 1992, width: 520, size: 11, weight: 700, fill: C.papier, align: "right" }),
  ]);

  const services = [];
  SERVICES.forEach(([title, desc], i) => {
    const y = 300 + i * 225;
    services.push(dot({ left: 90, top: y + 20, radius: 12, fill: C.mousse }));
    services.push(text(title, { left: 150, top: y, width: 1270, font: TITLE, size: 13 }));
    services.push(text(desc, { left: 150, top: y + 64, width: 1270, size: 10.5, fill: C.pierre, lineHeight: 1.3 }));
  });

  const price = priceTexts(info);
  const verso = page(C.papier, [
    text("Ce que je vous propose", { left: 90, top: 110, width: 1330, font: TITLE, size: 24 }),
    rect({ left: 90, top: 225, width: 80, height: 5, fill: C.rouille }),
    ...services,
    rect({ left: 60, top: 1230, width: 1390, height: 300, fill: C.sable, r: 30 }),
    text(price.kicker, { left: 130, top: 1270, width: 1250, size: 11, fill: C.pierre, weight: 700 }),
    text(price.amount, { left: 130, top: 1318, width: 1250, font: TITLE, size: 34, fill: C.rouille }),
    text(price.note, { left: 130, top: 1470, width: 1250, size: 11, fill: C.pierre }),
    text("Contactez Aurore", { left: 90, top: 1630, width: 950, font: TITLE, size: 16 }),
    text(contactLines(info, ["phone", "email", "site", "instagram"]), {
      left: 90, top: 1720, width: 950, size: 12, lineHeight: 1.45,
    }),
    text(info.area, { left: 90, top: 1990, width: 950, size: 9.5, fill: C.mousse, weight: 700 }),
    qr({ left: 1130, top: 1640, size: 290 }, info),
    text("Infos, tarifs et avis", { left: 1095, top: 1950, width: 360, size: 9, fill: C.pierre, align: "center" }),
  ]);
  return [recto, verso];
}

const STEPS = [
  ["On se rencontre", "Une visite chez vous avant le départ, pour faire connaissance et noter leurs habitudes."],
  ["Je m'occupe de tout", "Repas, eau fraîche, balades, litière, soins et traitements si besoin."],
  ["Vous avez des nouvelles", "Un message et des photos après chaque visite, où que vous soyez."],
];

function a5Vacances(info) {
  const recto = page(C.mousse, [
    paw({ left: 90, top: 120, size: 150, fill: C.miel }),
    text("Vous partez ?\nJe garde vos compagnons.", {
      left: 90, top: 360, width: 1330, font: TITLE, size: 40, fill: C.papier, lineHeight: 1.08,
    }),
    text(
      "Week-end, vacances ou déplacement : vos animaux restent chez eux, avec leurs repères, et vous recevez des nouvelles après chaque visite.",
      { left: 90, top: 920, width: 1240, size: 13, fill: C.sable, lineHeight: 1.35 },
    ),
    photoSlot({ left: 90, top: 1230, width: 1330, height: 620, r: 24 }),
    text(info.name, { left: 90, top: 1930, width: 820, font: TITLE, size: 14, fill: C.papier }),
    text(info.phone, { left: 920, top: 1928, width: 500, size: 15, weight: 700, fill: C.miel, align: "right" }),
  ]);

  const steps = [];
  STEPS.forEach(([title, desc], i) => {
    const y = 300 + i * 250;
    steps.push(text(String(i + 1), { left: 90, top: y - 10, width: 100, font: TITLE, size: 28, fill: C.rouille }));
    steps.push(text(title, { left: 220, top: y, width: 1200, font: TITLE, size: 14 }));
    steps.push(text(desc, { left: 220, top: y + 68, width: 1200, size: 11, fill: C.pierre, lineHeight: 1.3 }));
  });

  const verso = page(C.papier, [
    text("Partez l'esprit léger", { left: 90, top: 110, width: 1330, font: TITLE, size: 26 }),
    rect({ left: 90, top: 230, width: 80, height: 5, fill: C.rouille }),
    ...steps,
    rect({ left: 60, top: 1070, width: 1390, height: 270, fill: C.sable, r: 30 }),
    text("Pensez à réserver tôt", { left: 130, top: 1115, width: 1250, font: TITLE, size: 14 }),
    text("Les vacances scolaires partent vite : écrivez-moi dès que vos dates sont connues.", {
      left: 130, top: 1185, width: 1250, size: 11, fill: C.pierre, lineHeight: 1.3,
    }),
    text("Contact", { left: 90, top: 1430, width: 950, font: TITLE, size: 18 }),
    text(contactLines(info, ["phone", "email", "instagram", "site"]), {
      left: 90, top: 1530, width: 950, size: 12, lineHeight: 1.45,
    }),
    text(info.area, { left: 90, top: 1800, width: 950, size: 10, fill: C.mousse, weight: 700 }),
    qr({ left: 1130, top: 1450, size: 290 }, info),
    text("Infos et tarifs en ligne", { left: 1095, top: 1760, width: 360, size: 9, fill: C.pierre, align: "center" }),
    rect({ left: 0, top: 1960, width: 1510, height: 170, fill: C.rouille }),
    text(info.name, { left: 90, top: 2000, width: 800, font: TITLE, size: 14, fill: C.papier }),
    text(info.site, { left: 900, top: 2007, width: 520, size: 11, weight: 700, fill: C.papier, align: "right" }),
  ]);
  return [recto, verso];
}

// ---------------------------------------------------------------------------
// Flyer A4 (portrait 2130 × 3000, zone de sécurité 30 → 2100 × 30 → 2970)
// ---------------------------------------------------------------------------

const POSTER_SERVICES = [
  ["Visites à domicile", "Repas, soins et câlins : vos animaux restent chez eux."],
  ["Balades", "Des sorties à leur rythme, en laisse et en sécurité."],
  ["Garde à la journée", "Chez Aurore, pour ceux qui n'aiment pas rester seuls."],
];

function a4Affiche(info) {
  const cols = [];
  POSTER_SERVICES.forEach(([title, desc], i) => {
    const x = 130 + i * 645;
    cols.push(text(title, { left: x, top: 2050, width: 580, font: TITLE, size: 16, fill: C.rouille }));
    cols.push(text(desc, { left: x, top: 2135, width: 580, size: 11, fill: C.pierre, lineHeight: 1.3 }));
  });
  const priceLine = info.fromPrice
    ? `À partir de ${euros(info.fromPrice)} la visite`
    : "Devis gratuit, sur simple message";

  return [
    page(C.papier, [
      rect({ left: 0, top: 0, width: 2130, height: 1050, fill: C.rouille }),
      paw({ left: 130, top: 140, size: 170, fill: C.papier }),
      text(info.name, { left: 340, top: 190, width: 1660, font: TITLE, size: 18, fill: C.papier }),
      text("Besoin de quelqu'un\npour vos animaux ?", {
        left: 130, top: 380, width: 1870, font: TITLE, size: 48, fill: C.papier, lineHeight: 1.05,
      }),
      text("Visites, balades et garde à domicile, par une ancienne assistante vétérinaire.", {
        left: 130, top: 800, width: 1800, size: 16, fill: C.sable, lineHeight: 1.3,
      }),
      photoSlot({ left: 130, top: 1150, width: 1870, height: 800, r: 30 }),
      ...cols,
      text(priceLine, { left: 130, top: 2330, width: 1870, font: TITLE, size: 20 }),
      text(info.area, { left: 130, top: 2425, width: 1870, size: 12, fill: C.mousse, weight: 700 }),
      rect({ left: 0, top: 2510, width: 2130, height: 490, fill: C.mousse }),
      text("Appelez ou écrivez à Aurore", {
        left: 130, top: 2565, width: 1400, font: TITLE, size: 16, fill: C.papier,
      }),
      text(info.phone, { left: 130, top: 2655, width: 1400, font: TITLE, size: 30, fill: C.miel }),
      text(contactLines(info, ["email", "site"]), {
        left: 130, top: 2800, width: 1400, size: 13, fill: C.sable, lineHeight: 1.4,
      }),
      rect({ left: 1650, top: 2545, width: 360, height: 360, fill: C.papier, r: 20 }),
      qr({ left: 1680, top: 2575, size: 300 }, info),
      text("Infos et tarifs", { left: 1630, top: 2915, width: 400, size: 9, fill: C.sable, align: "center" }),
    ]),
  ];
}

// ---------------------------------------------------------------------------
// Modèles du plan marketing (cartes pour les prescripteurs et les clients,
// flyers et affichette). Même positionnement partout : « Aurore, ancienne
// assistante vétérinaire », compte rendu avec photos, première rencontre
// gratuite. Aucune promesse de soin, aucune garde au domicile d'Aurore.
// ---------------------------------------------------------------------------

const ROLE = "Aurore, ancienne assistante vétérinaire";
const OFFER = "Visites à domicile et promenades pour chiens, chats et NAC.";
const FIRST_MEETING = "Première rencontre gratuite, chez vous";

function legalLine(info) {
  const siret = info.siret ? `SIRET ${info.siret}` : "SIRET à compléter";
  return `${info.name} · ${siret} · Ne pas jeter sur la voie publique`;
}

// À laisser chez les vétérinaires, toiletteurs et éducateurs (20 cartes par visite).
function carteRecommandation(info) {
  const recto = page(C.papier, [
    paw({ left: 60, top: 62, size: 46 }),
    text(info.name, { left: 122, top: 62, width: 700, font: TITLE, size: 12 }),
    rect({ left: 60, top: 150, width: 50, height: 3, fill: C.rouille }),
    text(ROLE, { left: 60, top: 190, width: 760, size: 9, fill: C.mousse, weight: 700 }),
    text(OFFER, { left: 60, top: 250, width: 760, size: 8.5, lineHeight: 1.25 }),
    text("Compte rendu avec photos après chaque passage.", { left: 60, top: 345, width: 760, size: 8, fill: C.pierre }),
    rect({ left: 0, top: 440, width: 880, height: 140, fill: C.rouille }),
    text(FIRST_MEETING, { left: 60, top: 478, width: 760, size: 8.5, weight: 700, fill: C.papier }),
  ]);
  const verso = page(C.papier, [
    text(info.phone, { left: 60, top: 70, width: 520, font: TITLE, size: 16 }),
    text(contactLines(info, ["email", "site", "instagram"]), { left: 60, top: 170, width: 520, size: 8, lineHeight: 1.45 }),
    text(info.area, { left: 60, top: 330, width: 500, size: 7, fill: C.mousse, weight: 700 }),
    text("Je repère ce qui ne va pas et je vous préviens vite. Je ne remplace pas votre vétérinaire.", {
      left: 60, top: 420, width: 500, size: 6.5, fill: C.pierre, italic: true,
    }),
    qrFrom({ left: 620, top: 150, size: 200 }, info, "carte"),
    text("Infos et devis", { left: 600, top: 365, width: 240, size: 6.5, fill: C.pierre, align: "center" }),
  ]);
  return [recto, verso];
}

// Glissée avec la facture : le client la donne à un voisin et écrit son prénom au dos.
function carteParrainage(info) {
  const recto = page(C.mousse, [
    paw({ left: 395, top: 80, size: 90, fill: C.miel }),
    text("Merci de votre confiance", { left: 45, top: 230, width: 790, font: TITLE, size: 14, fill: C.papier, align: "center" }),
    text("Un voisin, un ami ou un collègue cherche quelqu'un pour ses animaux ?", {
      left: 90, top: 335, width: 700, size: 8.5, fill: C.sable, align: "center", lineHeight: 1.25,
    }),
    text("Donnez-lui cette carte.", { left: 90, top: 450, width: 700, size: 8.5, weight: 700, fill: C.miel, align: "center" }),
  ]);
  const verso = page(C.papier, [
    text("De la part de", { left: 60, top: 60, width: 480, size: 7.5, fill: C.pierre }),
    rect({ left: 60, top: 150, width: 480, height: 2, fill: C.encre }),
    text(info.name, { left: 60, top: 190, width: 520, font: TITLE, size: 11 }),
    text(ROLE, { left: 60, top: 252, width: 540, size: 6.5, fill: C.pierre }),
    text(contactLines(info, ["phone", "email", "site"]), { left: 60, top: 320, width: 540, size: 8, lineHeight: 1.45 }),
    text(FIRST_MEETING, { left: 60, top: 480, width: 540, size: 6.5, fill: C.mousse, weight: 700 }),
    qrFrom({ left: 620, top: 170, size: 200 }, info, "parrainage"),
    text("Infos et devis", { left: 600, top: 385, width: 240, size: 6.5, fill: C.pierre, align: "center" }),
  ]);
  return [recto, verso];
}

// Remise le soir de la fin de garde. L'adresse du QR est à remplacer par le lien
// d'avis Google (panneau « QR code ») : la consigne reste visible tant que ce n'est pas fait.
function carteAvis(info) {
  const stars = [0, 1, 2, 3, 4].map((i) => dot({ left: 342 + i * 42, top: 110, radius: 14, fill: C.miel }));
  const recto = page(C.papier, [
    ...stars,
    text("Votre avis compte", { left: 45, top: 190, width: 790, font: TITLE, size: 14, align: "center" }),
    text("Deux minutes sur Google aident les voisins à me trouver. Merci !", {
      left: 90, top: 290, width: 700, size: 8.5, fill: C.pierre, align: "center", lineHeight: 1.25,
    }),
    text("Aurore", { left: 45, top: 430, width: 790, font: TITLE, size: 11, fill: C.rouille, align: "center" }),
  ]);
  const verso = page(C.papier, [
    text("Scannez pour laisser un avis", { left: 60, top: 80, width: 500, font: TITLE, size: 11, lineHeight: 1.15 }),
    text("Avant d'imprimer : remplace l'adresse du QR code par ton lien d'avis Google, puis supprime ce texte.", {
      left: 60, top: 220, width: 500, size: 7, fill: C.rouille, lineHeight: 1.25,
    }),
    text(`${info.name}\n${info.phone}`, { left: 60, top: 420, width: 500, size: 8, lineHeight: 1.45 }),
    qrFrom({ left: 600, top: 150, size: 230 }, info, "avis"),
  ]);
  return [recto, verso];
}

function header(info) {
  return [
    text(info.name, { left: 90, top: 70, width: 620, font: TITLE, size: 13 }),
    text(info.area, { left: 720, top: 84, width: 700, size: 7.5, fill: C.pierre, align: "right" }),
    rect({ left: 90, top: 160, width: 1330, height: 3, fill: C.encre }),
  ];
}

const CARNET_SERVICES = [
  ["Visites à domicile", "Repas, eau fraîche, litière, câlins, jeu et un coup d'œil à la maison."],
  ["Promenades", "Une vraie balade, adaptée à l'âge et à l'énergie de votre chien."],
  ["Des nouvelles", "Un compte rendu avec photos après chaque passage."],
];

// Flyer de boîte aux lettres : repris du flyer « carnet » validé par Timothé
// (photo d'Aurore, accroche, services, parole d'Aurore, avis client, tarif, QR).
function a5Carnet(info) {
  const recto = page(C.papier, [
    ...header(info),
    photoSlot({ left: 90, top: 210, width: 1330, height: 760 }),
    text("Vos compagnons entre de bonnes mains en votre absence.", {
      left: 90, top: 1020, width: 1330, font: TITLE, size: 30, lineHeight: 1.05,
    }),
    text(`${ROLE}.`, { left: 90, top: 1400, width: 1330, size: 12, weight: 700 }),
    text(OFFER, { left: 90, top: 1465, width: 1330, size: 12, fill: C.pierre, lineHeight: 1.3 }),
    rect({ left: 90, top: 1760, width: 1330, height: 3, fill: C.encre }),
    text(info.phone, { left: 90, top: 1820, width: 600, font: TITLE, size: 22 }),
    text(contactLines(info, ["site", "instagram"]), {
      left: 700, top: 1850, width: 490, size: 9, fill: C.pierre, align: "right", lineHeight: 1.35,
    }),
    qrFrom({ left: 1230, top: 1800, size: 190 }, info, "flyer"),
    text("Scannez pour un devis", { left: 1180, top: 2000, width: 290, size: 6.5, fill: C.pierre, align: "center" }),
  ]);

  const cols = [];
  CARNET_SERVICES.forEach(([title, desc], i) => {
    const x = 90 + i * 455;
    cols.push(text(title, { left: x, top: 210, width: 420, font: TITLE, size: 12, lineHeight: 1.15 }));
    cols.push(text(desc, { left: x, top: 330, width: 420, size: 9.5, fill: C.pierre, lineHeight: 1.3 }));
  });
  const price = priceTexts(info);
  const lines = [FIRST_MEETING, "Devis personnalisé sous 24 h", info.area];
  if (info.insured) lines.push("Activité assurée en responsabilité civile pro");

  const verso = page(C.papier, [
    ...header(info),
    ...cols,
    rect({ left: 90, top: 560, width: 1330, height: 3, fill: C.encre }),
    text("« Je repère ce qui ne va pas et je vous préviens vite. Je ne remplace pas votre vétérinaire. »", {
      left: 90, top: 590, width: 1330, size: 14, italic: true, lineHeight: 1.28,
    }),
    text("Aurore, ancienne assistante vétérinaire, trois ans en clinique", {
      left: 90, top: 740, width: 1330, size: 9, weight: 700, fill: C.mousse,
    }),
    rect({ left: 90, top: 800, width: 1330, height: 3, fill: C.encre }),
    rect({ left: 90, top: 850, width: 1330, height: 290, fill: C.sable }),
    text(
      "« Merci Aurore pour votre professionnalisme et votre gentillesse. Et merci pour les nouvelles et les photos, c'est vraiment rassurant pendant nos absences. »",
      { left: 130, top: 885, width: 1250, size: 10.5, italic: true, lineHeight: 1.33 },
    ),
    text("Maëva, maman de la belle Roxanne", { left: 130, top: 1065, width: 1250, size: 8.5, fill: C.pierre }),
    rect({ left: 90, top: 1190, width: 1330, height: 560, fill: C.encre }),
    text(price.kicker, { left: 140, top: 1235, width: 800, size: 8.5, fill: C.sable, weight: 700 }),
    text(price.amount, { left: 140, top: 1275, width: 800, font: TITLE, size: 32, fill: C.papier }),
    text("la visite ou la balade", { left: 140, top: 1420, width: 800, size: 11, fill: C.papier }),
    text(lines.join("\n"), { left: 140, top: 1490, width: 840, size: 9.5, fill: C.sable, lineHeight: 1.4 }),
    rect({ left: 1030, top: 1240, width: 340, height: 340, fill: C.papier }),
    qrFrom({ left: 1055, top: 1265, size: 290 }, info, "flyer"),
    text("Scannez pour demander un rendez-vous", {
      left: 990, top: 1600, width: 420, size: 7.5, fill: C.sable, align: "center",
    }),
    text(info.phone, { left: 90, top: 1830, width: 700, font: TITLE, size: 22 }),
    text(contactLines(info, ["site", "instagram"]), {
      left: 860, top: 1840, width: 560, size: 9, fill: C.pierre, align: "right", lineHeight: 1.35,
    }),
    text(legalLine(info), { left: 90, top: 2020, width: 1330, size: 6, fill: C.pierre }),
  ]);
  return [recto, verso];
}

// Affichette à languettes détachables. Deux faces, on épingle celle qui convient :
// recto pour les vétérinaires et toiletteurs, verso pour les commerces et les gares.
const STRIP_W = 1480 / 6;

function affichetteFace(info, v) {
  const proofs = [
    ["Ancienne assistante vétérinaire", "Trois ans en clinique"],
    ["Des nouvelles", "Compte rendu et photos à chaque visite"],
    info.insured
      ? ["Activité assurée", "Responsabilité civile professionnelle"]
      : ["Contrat écrit", "Signé avant la première visite"],
  ];
  const cols = [];
  proofs.forEach(([title, desc], i) => {
    const x = 90 + i * 455;
    cols.push(rect({ left: x, top: 790, width: 420, height: 3, fill: C.encre }));
    cols.push(text(title, { left: x, top: 815, width: 420, size: 10, weight: 700, lineHeight: 1.15 }));
    cols.push(text(desc, { left: x, top: 900, width: 420, size: 9.5, fill: C.pierre, lineHeight: 1.25 }));
  });

  const strips = [rect({ left: 15, top: 1760, width: 1480, height: 2, fill: C.pierre })];
  for (let k = 0; k < 6; k++) {
    const x = Math.round((15 + k * STRIP_W) * 10) / 10;
    if (k > 0) strips.push(rect({ left: x, top: 1760, width: 2, height: 355, fill: C.pierre }));
    strips.push(
      text(`Aurore\nPet sitter\n${info.phone}`, {
        left: x + 16, top: 1820, width: 214, size: 7, align: "center", lineHeight: 1.35,
      }),
    );
  }

  const price = priceTexts(info);
  const contact = [info.site, info.instagram];
  if (info.siret) contact.push(`SIRET ${info.siret}`);

  return page(C.papier, [
    text(info.name, { left: 90, top: 70, width: 620, font: TITLE, size: 12 }),
    text(info.area, { left: 720, top: 82, width: 700, size: 7.5, fill: C.pierre, align: "right" }),
    rect({ left: 90, top: 170, width: 1330, height: 560, fill: C.mousse }),
    text(v.title, { left: 150, top: 225, width: 1210, font: TITLE, size: 32, fill: C.papier, lineHeight: 1.05 }),
    text(v.sub, { left: 150, top: 500, width: 1210, size: 12.5, fill: C.sable, lineHeight: 1.3 }),
    ...cols,
    text(price.kicker, { left: 90, top: 1010, width: 900, size: 8.5, fill: C.pierre, weight: 700 }),
    text(price.amount, { left: 90, top: 1045, width: 900, font: TITLE, size: 34 }),
    text("la visite ou la balade", { left: 90, top: 1190, width: 900, size: 11 }),
    text(v.lines.join("\n"), { left: 90, top: 1255, width: 950, size: 10, fill: C.pierre, lineHeight: 1.4 }),
    rect({ left: 1090, top: 1015, width: 330, height: 330, fill: C.sable }),
    qrFrom({ left: 1110, top: 1035, size: 290 }, info, "affiche"),
    text("Scannez pour un devis", { left: 1040, top: 1360, width: 430, size: 7.5, fill: C.pierre, align: "center" }),
    photoSlot({ left: 90, top: 1500, width: 200, height: 200, r: 100 }),
    text("Aurore", { left: 320, top: 1515, width: 560, font: TITLE, size: 13, fill: C.mousse }),
    text(info.phone, { left: 320, top: 1585, width: 600, font: TITLE, size: 24 }),
    text(contact.join("\n"), { left: 930, top: 1560, width: 490, size: 8, fill: C.pierre, align: "right", lineHeight: 1.35 }),
    ...strips,
  ]);
}

function a5Affichette(info) {
  return [
    affichetteFace(info, {
      title: "Partez l'esprit tranquille.",
      sub: "Visites à domicile et promenades pour vos chiens, vos chats et vos NAC.",
      lines: [FIRST_MEETING, "Animal âgé ou convalescent : surveillance attentive", "Sans soin ni diagnostic : je vous préviens vite"],
    }),
    affichetteFace(info, {
      title: "Il attend toute\nla journée ?",
      sub: "Promenades régulières en semaine pendant que vous travaillez, et visites à domicile quand vous partez.",
      lines: [FIRST_MEETING, "Les mêmes jours chaque semaine", "Devis personnalisé sous 24 h"],
    }),
  ];
}

const WALK_STEPS = [
  ["On se rencontre", "Chez vous, gratuitement : je fais connaissance avec votre chien et je note ses habitudes."],
  ["Des créneaux fixes", "Les mêmes jours chaque semaine, pendant que vous travaillez."],
  ["Vous avez des nouvelles", "Un message et une photo après chaque balade."],
];

// Campagnes « promenades régulières » de janvier et de la rentrée.
function a5Promenades(info) {
  const recto = page(C.rouille, [
    paw({ left: 90, top: 120, size: 150, fill: C.miel }),
    text("Il attend toute la journée ?\nJe passe le promener.", {
      left: 90, top: 360, width: 1330, font: TITLE, size: 36, fill: C.papier, lineHeight: 1.08,
    }),
    text("Des promenades régulières en semaine, pendant que vous travaillez. Votre chien se dépense, vous rentrez l'esprit léger.", {
      left: 90, top: 940, width: 1240, size: 13, fill: C.sable, lineHeight: 1.35,
    }),
    photoSlot({ left: 90, top: 1230, width: 1330, height: 620, r: 24 }),
    text(info.name, { left: 90, top: 1930, width: 820, font: TITLE, size: 14, fill: C.papier }),
    text(info.phone, { left: 920, top: 1928, width: 500, size: 15, weight: 700, fill: C.miel, align: "right" }),
  ]);

  const steps = [];
  WALK_STEPS.forEach(([title, desc], i) => {
    const y = 300 + i * 250;
    steps.push(text(String(i + 1), { left: 90, top: y - 10, width: 100, font: TITLE, size: 28, fill: C.rouille }));
    steps.push(text(title, { left: 220, top: y, width: 1200, font: TITLE, size: 14 }));
    steps.push(text(desc, { left: 220, top: y + 68, width: 1200, size: 11, fill: C.pierre, lineHeight: 1.3 }));
  });
  const price = priceTexts(info);

  const verso = page(C.papier, [
    text("Comment ça se passe", { left: 90, top: 110, width: 1330, font: TITLE, size: 26 }),
    rect({ left: 90, top: 230, width: 80, height: 5, fill: C.rouille }),
    ...steps,
    rect({ left: 60, top: 1070, width: 1390, height: 290, fill: C.sable, r: 30 }),
    text(`${price.kicker} ${price.amount}`, { left: 130, top: 1110, width: 1250, font: TITLE, size: 16 }),
    text(`${ROLE}. ${FIRST_MEETING}.`, {
      left: 130, top: 1195, width: 1250, size: 11, fill: C.pierre, lineHeight: 1.3,
    }),
    text("Contact", { left: 90, top: 1440, width: 950, font: TITLE, size: 18 }),
    text(contactLines(info, ["phone", "email", "instagram", "site"]), {
      left: 90, top: 1540, width: 950, size: 12, lineHeight: 1.45,
    }),
    text(info.area, { left: 90, top: 1810, width: 950, size: 10, fill: C.mousse, weight: 700 }),
    qrFrom({ left: 1130, top: 1460, size: 290 }, info, "flyer-promenades"),
    text("Infos et devis en ligne", { left: 1095, top: 1770, width: 360, size: 9, fill: C.pierre, align: "center" }),
    text(legalLine(info), { left: 90, top: 2020, width: 1330, size: 6, fill: C.pierre }),
  ]);
  return [recto, verso];
}

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

export const TEMPLATES = [
  {
    id: "carte-carnet",
    label: "Carnet",
    format: "CARTE",
    orientation: "paysage",
    description: "Recto clair avec l'empreinte et ton nom, verso coordonnées et QR code.",
    build: carteCarnet,
  },
  {
    id: "carte-rouille",
    label: "Rouille",
    format: "CARTE",
    orientation: "paysage",
    description: "Recto en aplat rouille avec ton nom, verso coordonnées.",
    build: carteRouille,
  },
  {
    id: "carte-recommandation",
    label: "Recommandation",
    format: "CARTE",
    orientation: "paysage",
    description: "À laisser chez les vétérinaires et toiletteurs : ton parcours, première rencontre gratuite, QR code.",
    build: carteRecommandation,
  },
  {
    id: "carte-parrainage",
    label: "Parrainage",
    format: "CARTE",
    orientation: "paysage",
    description: "À glisser avec la facture : le client écrit son prénom au dos et la donne à un voisin.",
    build: carteParrainage,
  },
  {
    id: "carte-avis",
    label: "Avis Google",
    format: "CARTE",
    orientation: "paysage",
    description: "À remettre en fin de garde. Remplace l'adresse du QR code par ton lien d'avis Google.",
    build: carteAvis,
  },
  {
    id: "a5-balade",
    label: "Balade",
    format: "A5",
    orientation: "portrait",
    description: "Grande photo et accroche, puis services, tarif « à partir de » et QR code.",
    build: a5Balade,
  },
  {
    id: "a5-vacances",
    label: "Vacances",
    format: "A5",
    orientation: "portrait",
    description: "« Vous partez ? Je garde vos compagnons », déroulé de la garde et coordonnées.",
    build: a5Vacances,
  },
  {
    id: "a5-carnet",
    label: "Carnet",
    format: "A5",
    orientation: "portrait",
    description: "Flyer de boîte aux lettres : ta photo, services, avis client, tarif « à partir de » et QR code.",
    build: a5Carnet,
  },
  {
    id: "a5-affichette",
    label: "Affichette",
    format: "A5",
    orientation: "portrait",
    description: "À languettes détachables. Recto pour les vétérinaires et toiletteurs, verso pour les commerces.",
    build: a5Affichette,
  },
  {
    id: "a5-promenades",
    label: "Promenades",
    format: "A5",
    orientation: "portrait",
    description: "Promenades régulières en semaine, pour les campagnes de janvier et de la rentrée.",
    build: a5Promenades,
  },
  {
    id: "a4-affiche",
    label: "Affiche",
    format: "A4",
    orientation: "portrait",
    description: "À poser chez le vétérinaire ou la boulangerie : services, tarif, contact et QR code.",
    build: a4Affiche,
  },
];

// Faces vides au fond papier pour un format ; [] si le format est inconnu.
export function blankPages(format) {
  const f = Object.prototype.hasOwnProperty.call(FORMATS, format) ? FORMATS[format] : null;
  if (!f) return [];
  return Array.from({ length: f.faces }, () => page(C.papier, []));
}

export function templatesFor(format) {
  return TEMPLATES.filter((t) => t.format === format);
}
