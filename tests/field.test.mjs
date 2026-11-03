import { test, expect } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { default: Field } = await import("../components/Field.jsx");
const { default: FieldSet } = await import("../components/FieldSet.jsx");
const h = React.createElement;

const attr = (html, tag, name) => {
  const m = html.match(new RegExp(`<${tag}[^>]*\\s${name}="([^"]*)"`));
  return m ? m[1] : null;
};

test("libellé relié au champ par for/id", () => {
  const html = renderToStaticMarkup(h(Field, { label: "Nom" }, h("input", { className: "input" })));
  const id = attr(html, "input", "id");
  expect(id).toBeTruthy();
  expect(attr(html, "label", "for")).toBe(id);
  expect(html).toContain(">Nom<");
  expect(html).not.toContain("aria-invalid");
});

test("aide reliée par aria-describedby", () => {
  const html = renderToStaticMarkup(h(Field, { label: "Email", hint: "Pour le compte rendu" }, h("input", {})));
  const desc = attr(html, "input", "aria-describedby");
  expect(desc).toBeTruthy();
  expect(html).toMatch(new RegExp(`id="${desc}"[^>]*>Pour le compte rendu<`));
});

test("erreur : aria-invalid, décrite, annoncée", () => {
  const html = renderToStaticMarkup(h(Field, { label: "Email", hint: "Aide", error: "Adresse invalide" }, h("input", {})));
  expect(attr(html, "input", "aria-invalid")).toBe("true");
  const ids = attr(html, "input", "aria-describedby").split(" ");
  expect(ids.length).toBe(2);
  expect(html).toContain('aria-live="polite"');
  expect(html).toContain("Adresse invalide");
});

test("obligatoire : mention écrite et attribut required sur le champ", () => {
  const html = renderToStaticMarkup(h(Field, { label: "Nom", required: true }, h("input", {})));
  expect(html).toContain("(obligatoire)");
  expect(html).toMatch(/<input[^>]*required/);
});

test("un id déjà présent sur le champ est conservé", () => {
  const html = renderToStaticMarkup(h(Field, { label: "Note" }, h("textarea", { id: "perso" })));
  expect(attr(html, "textarea", "id")).toBe("perso");
  expect(attr(html, "label", "for")).toBe("perso");
});

test("aria-describedby déjà présent sur le champ est complété, pas écrasé", () => {
  const html = renderToStaticMarkup(h(Field, { label: "Note", hint: "Aide" }, h("input", { "aria-describedby": "autre" })));
  expect(attr(html, "input", "aria-describedby").split(" ")).toContain("autre");
});

test("FieldSet : fieldset et légende", () => {
  const html = renderToStaticMarkup(h(FieldSet, { legend: "Jours" }, h("button", { type: "button" }, "Lun")));
  expect(html).toMatch(/<fieldset[^>]*>\s*<legend[^>]*>Jours<\/legend>/);
});
