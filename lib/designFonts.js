// Polices de l'onglet Conception. Les faces sont stockées avec un nom LOGIQUE
// ("Fraunces", "Atkinson Hyperlegible") ; dans le navigateur, next/font expose
// les vraies familles (noms hachés) via des variables CSS (app/layout.js).
// mapPageFonts est pur ; browserFontResolver et ensureFontsLoaded ne touchent
// `document` qu'à l'appel, jamais au chargement du module.

export const FONTS = [
  { key: "Fraunces", cssVar: "--font-fraunces", role: "titre" },
  { key: "Atkinson Hyperlegible", cssVar: "--font-atkinson", role: "texte" },
];

function mapStyles(styles, mapFn) {
  if (Array.isArray(styles)) {
    // Fabric v6 : [{ start, end, style: { fontFamily, … } }]
    return styles.map((entry) => {
      if (!entry || typeof entry !== "object" || !entry.style) return entry;
      if (typeof entry.style.fontFamily !== "string") return entry;
      return { ...entry, style: { ...entry.style, fontFamily: mapFn(entry.style.fontFamily) } };
    });
  }
  if (styles && typeof styles === "object") {
    // Ancien format : { ligne: { caractère: { fontFamily, … } } }
    const out = {};
    for (const [line, chars] of Object.entries(styles)) {
      if (!chars || typeof chars !== "object") {
        out[line] = chars;
        continue;
      }
      const lineOut = {};
      for (const [ch, style] of Object.entries(chars)) {
        lineOut[ch] =
          style && typeof style.fontFamily === "string" ? { ...style, fontFamily: mapFn(style.fontFamily) } : style;
      }
      out[line] = lineOut;
    }
    return out;
  }
  return styles;
}

function mapObject(obj, mapFn) {
  if (!obj || typeof obj !== "object") return obj;
  const out = { ...obj };
  if (typeof out.fontFamily === "string") out.fontFamily = mapFn(out.fontFamily);
  if (out.styles) out.styles = mapStyles(out.styles, mapFn);
  if (Array.isArray(out.objects)) out.objects = out.objects.map((o) => mapObject(o, mapFn));
  if (out.clipPath && typeof out.clipPath === "object") out.clipPath = mapObject(out.clipPath, mapFn);
  return out;
}

// Nouvelle face dont chaque fontFamily (groupes compris) passe par mapFn.
export function mapPageFonts(page, mapFn) {
  if (!page || typeof page !== "object") return page;
  const out = { ...page };
  if (Array.isArray(page.objects)) out.objects = page.objects.map((o) => mapObject(o, mapFn));
  return out;
}

function normalizeName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[\s_'"\-]/g, "");
}

// Navigateur seulement. Lit les variables CSS de next/font sur document.body.
// toRuntime("Fraunces") → "'__Fraunces_xxx', '__Fraunces_Fallback_xxx'" ;
// toStored(…) → "Fraunces". Une famille inconnue est rendue telle quelle.
export function browserFontResolver() {
  const runtime = {};
  for (const f of FONTS) {
    let value = "";
    try {
      value = getComputedStyle(document.body).getPropertyValue(f.cssVar).trim();
    } catch {
      value = "";
    }
    runtime[f.key] = value || f.key;
  }
  return {
    toRuntime(logical) {
      return Object.prototype.hasOwnProperty.call(runtime, logical) ? runtime[logical] : logical;
    },
    toStored(name) {
      if (typeof name !== "string") return name;
      for (const f of FONTS) {
        if (name === f.key || name === runtime[f.key]) return f.key;
      }
      const n = normalizeName(name);
      for (const f of FONTS) {
        if (n.includes(normalizeName(f.key))) return f.key;
      }
      return name;
    },
  };
}

// Navigateur seulement. Charge chaque police en 400, 600, 700 et italique.
// Résout true si chaque famille a au moins une face chargée, false sinon.
export async function ensureFontsLoaded() {
  if (typeof document === "undefined" || !document.fonts || typeof document.fonts.load !== "function") {
    return false;
  }
  const resolver = browserFontResolver();
  const variants = ["400", "600", "700", "italic 400"];
  const results = await Promise.all(
    FONTS.map(async (f) => {
      const family = resolver.toRuntime(f.key);
      const loaded = await Promise.all(
        variants.map((v) => document.fonts.load(`${v} 40px ${family}`).catch(() => [])),
      );
      return loaded.some((faces) => faces && faces.length > 0);
    }),
  );
  if (document.fonts.ready) await document.fonts.ready;
  return results.every(Boolean);
}
