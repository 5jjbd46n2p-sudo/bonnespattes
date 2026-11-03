import { test, expect } from "bun:test";
import crypto from "crypto";
import { encrypt } from "../lib/crypto.js";

test("encrypt refuse une valeur qui n'est pas du texte (pas de « null » chiffré par erreur)", () => {
  process.env.DATA_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
  expect(() => encrypt(null)).toThrow("Valeur à chiffrer invalide.");
  expect(() => encrypt(undefined)).toThrow("Valeur à chiffrer invalide.");
  expect(() => encrypt(42)).toThrow("Valeur à chiffrer invalide.");
  expect(typeof encrypt("ok")).toBe("string");
});
