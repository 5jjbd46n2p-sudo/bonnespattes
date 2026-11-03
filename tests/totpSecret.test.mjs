import { test, expect, mock } from "bun:test";
import crypto from "crypto";

const calls = [];
mock.module("../lib/db.js", () => ({
  query: async (sql, params) => {
    calls.push({ sql, params });
    return { rows: [] };
  },
}));
process.env.DATA_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
const { readTotpSecret } = await import("../lib/security.js");
const { encrypt, isEncrypted } = await import("../lib/crypto.js");

test("secret en clair : renvoyé tel quel et rechiffré en base", async () => {
  calls.length = 0;
  expect(await readTotpSecret({ id: "u1", totp_secret: "JBSWY3DPEHPK3PXP" })).toBe("JBSWY3DPEHPK3PXP");
  expect(calls.length).toBe(1);
  expect(calls[0].sql).toContain("UPDATE users SET totp_secret");
  expect(isEncrypted(calls[0].params[1])).toBe(true);
  expect(calls[0].params[2]).toBe("JBSWY3DPEHPK3PXP");
});

test("secret chiffré : déchiffré sans écriture", async () => {
  calls.length = 0;
  expect(await readTotpSecret({ id: "u1", totp_secret: encrypt("JBSWY3DPEHPK3PXP") })).toBe("JBSWY3DPEHPK3PXP");
  expect(calls.length).toBe(0);
});

test("secret chiffré illisible (autre clé) : erreur, jamais de repli", async () => {
  const other = encrypt("JBSWY3DPEHPK3PXP");
  process.env.DATA_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
  await expect(readTotpSecret({ id: "u1", totp_secret: other })).rejects.toThrow();
});

test("pas de secret : null", async () => {
  expect(await readTotpSecret({ id: "u1", totp_secret: null })).toBe(null);
});
