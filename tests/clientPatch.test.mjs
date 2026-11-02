import { test, expect } from "bun:test";
import { validateClientPatch } from "../lib/clientPatch.js";

const current = { email: "marie@gmail", phone: "06 12 34 56 78 (Marc) / 07 98 76 54 32" };

test("fiche ancienne avec email sans point : modifier les notes reste possible", () => {
  const r = validateClientPatch({ email: "marie@gmail", phone: current.phone, notes: "Croquettes" }, current);
  expect(r.error).toBeUndefined();
});

test("téléphone long (deux numéros) accepté", () => {
  expect(validateClientPatch({ phone: current.phone }, current).error).toBeUndefined();
});

test("nouvel email mal formé refusé", () => {
  expect(validateClientPatch({ email: "paul@x" }, current).error).toBe("Adresse email invalide.");
});

test("email vide accepté", () => {
  expect(validateClientPatch({ email: "" }, current).error).toBeUndefined();
});

test("notes trop longues refusées", () => {
  expect(validateClientPatch({ notes: "x".repeat(5001) }, current).error).toMatch("5000");
});

test("type invalide refusé, null devient vide", () => {
  expect(validateClientPatch({ address: 12 }, current).error).toBe("Champ invalide.");
  expect(validateClientPatch({ address: null }, current).body.address).toBe("");
});

test("tarif horaire 0, vide ou chaîne numérique", () => {
  expect(validateClientPatch({ hourlyRate: 0 }, current).body.hourlyRate).toBe(0);
  expect(validateClientPatch({ hourlyRate: "" }, current).body.hourlyRate).toBe(0);
  expect(validateClientPatch({ hourlyRate: "24.5" }, current).body.hourlyRate).toBe(24.5);
  expect(validateClientPatch({ hourlyRate: -1 }, current).error).toBe("Tarif horaire invalide.");
});
