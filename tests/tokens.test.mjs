import { test, expect } from "bun:test";
import { readFileSync } from "fs";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

// --color-<nom>: light-dark(<clair>, <sombre>)
function token(name) {
  const m = css.match(new RegExp(`--color-${name}:\\s*light-dark\\(\\s*([^,]+?)\\s*,\\s*([^)]+?)\\s*\\)`, "i"));
  if (!m) throw new Error(`token ${name} absent ou pas en light-dark()`);
  return { clair: m[1].toLowerCase(), sombre: m[2].toLowerCase() };
}

function lum(hex) {
  const c = hex.replace("#", "").match(/../g).map((x) => parseInt(x, 16) / 255);
  const l = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
}
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const ATTENDU = {
  papier: ["#f7f2ea", "#15120f"],
  lin: ["#fffcf7", "#1e1a16"],
  sable: ["#efe7da", "#29241f"],
  encre: ["#1f1a15", "#efe7da"],
  pierre: ["#6e655a", "#a89e91"],
  trait: ["#e3d9c9", "#3a332c"],
  rouille: ["#a8481f", "#e0784a"],
  "rouille-fonce": ["#8a3a18", "#ee8e62"],
  mousse: ["#4f6b3a", "#9dbb84"],
  miel: ["#d69a4e", "#e2ae6a"],
  brique: ["#b3261e", "#f08a80"],
  bord: ["#8c8174", "#7d7266"],
};

test("couleurs inchangées, bord ajouté, toutes en light-dark()", () => {
  for (const [name, [clair, sombre]] of Object.entries(ATTENDU)) {
    expect(token(name)).toEqual({ clair, sombre });
  }
});

test("bord et rouille à 3:1 minimum sur lin et papier, dans les deux thèmes", () => {
  for (const fg of ["bord", "rouille"]) {
    for (const bg of ["lin", "papier"]) {
      expect(contrast(token(fg).clair, token(bg).clair)).toBeGreaterThanOrEqual(3);
      expect(contrast(token(fg).sombre, token(bg).sombre)).toBeGreaterThanOrEqual(3);
    }
  }
});

test("plus de bloc sombre dupliqué, thème forcé respecté", () => {
  expect(css).not.toMatch(/@media\s*\(prefers-color-scheme:\s*dark\)/);
  expect(css).toMatch(/:root\s*\{[^}]*color-scheme:\s*light dark/);
  expect(css).toMatch(/:root\[data-theme="light"\]\s*\{[^}]*color-scheme:\s*light\s*;/);
  expect(css).toMatch(/:root\[data-theme="dark"\]\s*\{[^}]*color-scheme:\s*dark\s*;/);
  // Une seule déclaration par couleur
  expect(css.match(/--color-papier:/g).length).toBe(2); // :root + @theme inline
});

test("teintes Tailwind : valeur claire par défaut, valeur sombre conservée", () => {
  expect(css).toContain("--color-amber-50: light-dark(oklch(98.7% 0.022 95.277), rgba(245, 158, 11, 0.1));");
  expect(css).toContain("--color-stone-700: light-dark(oklch(37.4% 0.01 67.558), #d3c9bb);");
});

test("échelle nommée exposée à Tailwind", () => {
  for (const t of ["--text-titre-1:", "--text-titre-2:", "--text-corps:", "--text-legende:", "--radius-carte:", "--radius-pilule:", "--color-bord:"]) {
    expect(css).toContain(t);
  }
  for (const s of ["--space-1:", "--space-2:", "--space-3:", "--space-4:", "--space-6:", "--space-8:"]) expect(css).toContain(s);
  expect(css).toMatch(/\.chiffres/);
});
