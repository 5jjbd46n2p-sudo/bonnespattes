import { test, expect, beforeEach } from "bun:test";
import crypto from "crypto";
import { encrypt, decrypt, isEncrypted } from "../lib/crypto.js";

beforeEach(() => {
  process.env.DATA_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
});

test("aller-retour, y compris vide et accents", () => {
  for (const s of ["1234A", "", "Clé sous le pot, digicode 4B12 éàç"]) {
    expect(decrypt(encrypt(s))).toBe(s);
  }
});

test("deux chiffrements du même texte diffèrent", () => {
  expect(encrypt("x")).not.toBe(encrypt("x"));
});

test("isEncrypted", () => {
  expect(isEncrypted(encrypt("x"))).toBe(true);
  expect(isEncrypted("JBSWY3DP")).toBe(false);
  expect(isEncrypted(null)).toBe(false);
});

test("donnée modifiée -> erreur", () => {
  const [v, iv, tag, data] = encrypt("secret").split(":");
  const buf = Buffer.from(data, "base64");
  buf[0] ^= 1;
  expect(() => decrypt([v, iv, tag, buf.toString("base64")].join(":"))).toThrow();
});

test("clé absente ou invalide -> erreur", () => {
  delete process.env.DATA_ENCRYPTION_KEY;
  expect(() => encrypt("x")).toThrow("DATA_ENCRYPTION_KEY manquante ou invalide.");
  process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(16).toString("base64");
  expect(() => encrypt("x")).toThrow("DATA_ENCRYPTION_KEY manquante ou invalide.");
});

test("autre clé -> erreur", () => {
  const c = encrypt("x");
  process.env.DATA_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
  expect(() => decrypt(c)).toThrow();
});
