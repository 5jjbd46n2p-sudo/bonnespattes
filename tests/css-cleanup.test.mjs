import { test, expect } from "bun:test";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const ROOT = new URL("..", import.meta.url).pathname;
const css = readFileSync(join(ROOT, "app/globals.css"), "utf8");
// La vitrine est refaite à part (lot 2) : hors périmètre du lot 1.
const EXCLUS = ["app/page.js", "components/landing/"];

function sources(dir) {
  const out = [];
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) out.push(...sources(rel));
    else if (/\.(jsx?|tsx?)$/.test(name) && !EXCLUS.some((e) => rel.startsWith(e))) out.push(rel);
  }
  return out;
}
const FICHIERS = [...sources("app"), ...sources("components")];

test("aucun utilitaire Tailwind en !important dans l'interface", () => {
  const fautifs = [];
  for (const f of FICHIERS) {
    const src = readFileSync(join(ROOT, f), "utf8");
    // Classe Tailwind préfixée par « ! » dans une chaîne de classes (ex. !py-1, !w-24)
    const m = src.match(/(?<=["'`\s])![a-z]+-[\w\[\].%-]+(?=[\s"'`])/g);
    if (m) fautifs.push(`${f}: ${m.join(" ")}`);
  }
  expect(fautifs).toEqual([]);
});

test("plus de classes .ios-*, remplacées par .field-*", () => {
  const restants = FICHIERS.filter((f) => readFileSync(join(ROOT, f), "utf8").includes("ios-field"));
  expect({ css: css.includes("ios-field"), fichiers: restants }).toEqual({ css: false, fichiers: [] });
  expect([".field-group", ".field-row", ".field-row-label"].filter((c) => !css.includes(c))).toEqual([]);
});

test("focus visible global en rouille, 2px, décalé de 2px", () => {
  expect({
    focusVisible: /:focus-visible[^{]*\{[^}]*outline:\s*2px solid var\(--color-rouille\)[^}]*outline-offset:\s*2px/.test(css),
    inputFocus: /\.input:focus\s*\{/.test(css),
    pillFocus: /\.pill-input:focus\s*\{/.test(css),
    outlineNone: /outline:\s*none/.test(css),
  }).toEqual({ focusVisible: true, inputFocus: false, pillFocus: false, outlineNone: false });
});

test("boutons compacts et de suppression, champs à bordure 3:1", () => {
  expect({
    btnSm: /\.btn-sm\s*\{[^}]*min-height:\s*36px/.test(css),
    btnDanger: /\.btn-danger\s*\{[^}]*color:\s*var\(--color-brique\)/.test(css),
    inputBord: /\.input\s*\{[^}]*border:\s*1px solid var\(--color-bord\)/.test(css),
  }).toEqual({ btnSm: true, btnDanger: true, inputBord: true });
});
