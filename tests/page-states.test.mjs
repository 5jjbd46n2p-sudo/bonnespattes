import { test, expect, mock } from "bun:test";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (f) => readFileSync(join(ROOT, f), "utf8");

const FICHIERS = [
  "app/loading.js", "app/error.js", "app/not-found.js", "app/global-error.js",
  "app/admin/loading.js", "app/admin/error.js", "app/admin/not-found.js",
  "app/portal/loading.js", "app/portal/error.js", "app/portal/not-found.js",
];

test("les 10 fichiers de convention existent", () => {
  expect(FICHIERS.filter((f) => !existsSync(join(ROOT, f)))).toEqual([]);
});

test("error.js et global-error.js : composants client, retry et digest, jamais error.message", () => {
  for (const f of ["app/error.js", "app/admin/error.js", "app/portal/error.js", "app/global-error.js"]) {
    const s = read(f);
    expect({ f, client: /^["']use client["']/.test(s.trimStart()), retry: s.includes("retry"), message: s.includes("error.message") })
      .toEqual({ f, client: true, retry: true, message: false });
  }
  const g = read("app/global-error.js");
  expect({ html: g.includes('<html lang="fr">'), body: g.includes("<body"), css: /import\s+["'].*\.css["']/.test(g), metadata: g.includes("export const metadata") })
    .toEqual({ html: true, body: true, css: false, metadata: false });
});

test("ton de chaque espace", () => {
  expect(read("app/not-found.js")).toContain("Cette page n'existe pas (ou plus).");
  expect(read("app/admin/not-found.js")).toContain("Introuvable. Le client ou la visite a peut-être été supprimé.");
  expect(read("app/portal/not-found.js")).toContain("Cette page n'existe pas.");
  for (const f of FICHIERS) {
    expect(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(read(f))).toBe(false);
  }
});

// Rendu des composants partagés (next/link simulé : pas de node_modules Next ici)
mock.module("next/link", () => ({ default: ({ href, children, ...p }) => React.createElement("a", { href, ...p }, children) }));
const { LoadingBlocks, ErrorState, NotFoundState } = await import("../components/PageStates.jsx");

test("chargement : statut annoncé, texte « Chargement… »", () => {
  const html = renderToStaticMarkup(React.createElement(LoadingBlocks));
  expect(html).toContain('role="status"');
  expect(html).toContain("Chargement…");
});

test("erreur : titre, référence digest, bouton Réessayer et lien de retour, pas de message brut", () => {
  const html = renderToStaticMarkup(
    React.createElement(ErrorState, { digest: "abc123", onRetry: () => {}, backHref: "/admin", backLabel: "Retour à Aujourd'hui" })
  );
  expect(html).toContain("Cette page n&#x27;a pas pu s&#x27;afficher.");
  expect(html).toContain("abc123");
  expect(html).toContain("Réessayer");
  expect(html).toContain('href="/admin"');
  const sans = renderToStaticMarkup(React.createElement(ErrorState, { onRetry: () => {}, backHref: "/", backLabel: "Accueil" }));
  expect(sans).not.toContain("Référence");
});

test("introuvable : titre et liens", () => {
  const html = renderToStaticMarkup(
    React.createElement(NotFoundState, { title: "Cette page n'existe pas.", links: [{ href: "/portal", label: "Retour à mon espace" }] })
  );
  expect(html).toContain("<h1");
  expect(html).toContain('href="/portal"');
});
