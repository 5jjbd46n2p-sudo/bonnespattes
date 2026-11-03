import { test, expect, mock } from "bun:test";

// L'assemblage est pur ; la base est simulée pour pouvoir importer le module.
mock.module("../lib/db.js", () => ({ query: async () => ({ rows: [] }), tx: async (fn) => fn({ query: async () => ({ rows: [] }) }) }));
const { assembleClientExport } = await import("../lib/clientExport.js");

const base = {
  now: new Date("2026-11-03T10:00:00Z"),
  client: { first_name: "Christine", last_name: "L." },
  account: null,
  requests: [],
  pets: [{ name: "Tweed" }],
  visits: [{ date: "2026-10-01" }],
  invoices: [{ number: "F0004" }],
  deposits: [],
  contracts: [],
  credits: [],
  quotes: [],
  quoteItems: [],
  photos: [],
};

test("clés existantes conservées à l'identique", () => {
  const out = assembleClientExport(base);
  expect(out.export_genere_le).toBe("2026-11-03T10:00:00.000Z");
  expect(out.profil).toEqual(base.client);
  expect(out.compte_espace_client).toBe(null);
  expect(out.animaux).toEqual(base.pets);
  expect(out.visites).toEqual(base.visits);
  expect(out.factures).toEqual(base.invoices);
  for (const k of ["demandes_de_contact", "acomptes", "contrats", "parrainage_credits"]) expect(out[k]).toEqual([]);
  expect(typeof out.note).toBe("string");
});

test("client sans devis ni photo : listes vides, jamais null", () => {
  const out = assembleClientExport(base);
  expect(out.devis).toEqual([]);
  expect(out.photos).toEqual([]);
});

test("lignes regroupées sous leur devis, dans l'ordre", () => {
  const out = assembleClientExport({
    ...base,
    quotes: [
      { id: "q1", number: "D0002", total_ttc: "40" },
      { id: "q2", number: "D0001", total_ttc: "15" },
    ],
    quoteItems: [
      { quote_id: "q1", description: "Visite 2", position: 1 },
      { quote_id: "q2", description: "Visite", position: 0 },
      { quote_id: "q1", description: "Visite 1", position: 0 },
    ],
  });
  expect(out.devis.map((q) => q.numero ?? q.number)).toEqual(["D0002", "D0001"]);
  expect(out.devis[0].lignes.map((l) => l.description)).toEqual(["Visite 1", "Visite 2"]);
  expect(out.devis[1].lignes.map((l) => l.description)).toEqual(["Visite"]);
  // l'identifiant technique et la clé de regroupement ne sortent pas
  expect(out.devis[0].id).toBeUndefined();
  expect(out.devis[0].lignes[0].quote_id).toBeUndefined();
});

test("photos : liste sans adresse de stockage", () => {
  const out = assembleClientExport({
    ...base,
    photos: [{ id: "p1", created_at: "2026-10-01T09:00:00Z", visit_date: "2026-10-01", pet_name: "Tweed", url: "https://blob/x" }],
  });
  expect(out.photos).toEqual([{ id: "p1", created_at: "2026-10-01T09:00:00Z", visit_date: "2026-10-01", pet_name: "Tweed" }]);
  expect(JSON.stringify(out)).not.toContain("https://blob");
});
