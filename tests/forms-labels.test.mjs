import { test, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = new URL("..", import.meta.url).pathname;
const FORMS = [
  "components/NewVisitForm.jsx",
  "components/SettingsForm.jsx",
  "components/NewInvoiceForm.jsx",
  "app/admin/clients/new/page.js",
];

// Un champ est correctement étiqueté s'il est :
//  - dans un <Field …>…</Field> (libellé relié par htmlFor/id) ;
//  - enveloppé dans un <label>…</label> (libellé implicite : cases à cocher) ;
//  - porteur d'un aria-label explicite.
function unlabelled(src) {
  const out = [];
  const re = /<(input|select|textarea)\b([^>]*?)\/?>/gs;
  let m;
  while ((m = re.exec(src))) {
    const attrs = m[2];
    if (/type=["']hidden["']/.test(attrs) || /aria-label=/.test(attrs)) continue;
    const before = src.slice(0, m.index);
    const inField = before.lastIndexOf("<Field") > before.lastIndexOf("</Field>") && before.lastIndexOf("<Field") > before.lastIndexOf("<FieldSet");
    const inLabel = before.lastIndexOf("<label") > before.lastIndexOf("</label>");
    if (!inField && !inLabel) out.push(`${src.slice(0, m.index).split("\n").length}: <${m[1]}${attrs.slice(0, 60).replace(/\s+/g, " ")}`);
  }
  return out;
}

for (const f of FORMS) {
  test(`${f} : chaque champ a un libellé relié`, () => {
    expect(unlabelled(readFileSync(join(ROOT, f), "utf8"))).toEqual([]);
  });
  test(`${f} : plus de <label> détaché sans htmlFor`, () => {
    const src = readFileSync(join(ROOT, f), "utf8");
    // Un <label> qui se ferme sans contenir de champ est un libellé détaché.
    const detaches = [...src.matchAll(/<label\b(?![^>]*htmlFor)[^>]*>((?:(?!<\/label>).)*)<\/label>/gs)]
      .filter((m) => !/<(input|select|textarea)\b/.test(m[1]))
      .map((m) => m[1].replace(/\s+/g, " ").trim().slice(0, 50));
    expect(detaches).toEqual([]);
  });
}
