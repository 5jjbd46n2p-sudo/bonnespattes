import { test, expect } from "bun:test";
import { canonicalJson, sealPayload, computeSeal, verifySeal } from "../lib/contractSeal.js";

const sig = {
  id: "8b0e2c4a-1111-4222-8333-444455556666",
  client_id: "c8fe523d-0160-420f-8ea3-f26ed59921f8",
  version: 2,
  content: "Contrat de pet-sitting\n## Article 1\nTexte signé — avec accents é à ç et 🐾",
  content_hash: "abc123",
  signer_name: "Christine Loosen",
  signer_ip: "203.0.113.7",
  signer_user_agent: "Mozilla/5.0",
  checkboxes: { accept: true, photos: false },
  emergency_contact: "Paul, 06 00 00 00 00",
  vet_info: "Clinique de Viarmes",
  signed_at_utc: "2026-11-02T17:32:54.256140Z",
  status: "SIGNE",
  otp_hash: "ignored",
};

test("canonicalJson trie les clés récursivement, sans espaces", () => {
  expect(canonicalJson({ b: 1, a: { d: [2, { z: 1, y: 2 }], c: null } })).toBe('{"a":{"c":null,"d":[2,{"y":2,"z":1}]},"b":1}');
});

test("sealPayload ne garde que les champs du dossier", () => {
  expect(Object.keys(sealPayload(sig)).sort()).toEqual(
    ["checkboxes", "client_id", "content", "content_hash", "emergency_contact", "id", "signed_at", "signer_ip", "signer_name", "signer_user_agent", "version", "vet_info"]
  );
  expect(sealPayload({ ...sig, vet_info: undefined }).vet_info).toBe(null);
});

test("même dossier, clés dans un autre ordre -> même empreinte", () => {
  const reordered = Object.fromEntries(Object.entries(sig).reverse());
  reordered.checkboxes = { photos: false, accept: true };
  expect(computeSeal(reordered)).toBe(computeSeal(sig));
});

test("signed_at : l'horodatage UTC du dossier est prioritaire, une Date sert de repli", () => {
  const withDate = { ...sig, signed_at_utc: undefined, signed_at: new Date("2026-11-02T17:32:54.256Z") };
  expect(sealPayload(withDate).signed_at).toBe("2026-11-02T17:32:54.256Z");
  expect(sealPayload(sig).signed_at).toBe("2026-11-02T17:32:54.256140Z");
});

test("toute modification change l'empreinte", () => {
  const base = computeSeal(sig);
  expect(computeSeal({ ...sig, signer_name: "C. Loosen" })).not.toBe(base);
  expect(computeSeal({ ...sig, checkboxes: { accept: false, photos: false } })).not.toBe(base);
  expect(computeSeal({ ...sig, content: sig.content + " " })).not.toBe(base);
  expect(computeSeal({ ...sig, signed_at_utc: "2026-11-02T17:32:54.256141Z" })).not.toBe(base);
  expect(computeSeal({ ...sig, otp_hash: "autre" })).toBe(base);
});

test("empreinte stable (UTF-8, aller-retour JSON)", () => {
  expect(computeSeal(sig)).toMatch(/^[0-9a-f]{64}$/);
  expect(computeSeal(sig)).toBe(computeSeal(JSON.parse(JSON.stringify(sig))));
});

test("verifySeal", () => {
  expect(verifySeal({ ...sig, seal_hash: computeSeal(sig) })).toEqual({ ok: true, legacy: false });
  expect(verifySeal({ ...sig, seal_hash: computeSeal(sig), seal_legacy: true })).toEqual({ ok: true, legacy: true });
  expect(verifySeal({ ...sig, seal_hash: null }).ok).toBe(false);
  expect(verifySeal({ ...sig, seal_hash: "zz" }).ok).toBe(false);
  expect(verifySeal({ ...sig, seal_hash: computeSeal(sig), vet_info: "modifié" }).ok).toBe(false);
});
