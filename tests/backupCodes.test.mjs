import { test, expect } from "bun:test";
import { generateBackupCodes, normalizeBackupCode, hashBackupCode, looksLikeBackupCode, BACKUP_CODE_COUNT } from "../lib/backupCodes.js";

test("10 codes distincts au format XXXX-XXXX, alphabet sans caractères ambigus", () => {
  const codes = generateBackupCodes();
  expect(BACKUP_CODE_COUNT).toBe(10);
  expect(codes.length).toBe(10);
  expect(new Set(codes).size).toBe(10);
  for (const c of codes) expect(c).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
});

test("normalisation : casse, espaces et tirets ignorés", () => {
  expect(normalizeBackupCode(" abcd-efgh ")).toBe("ABCDEFGH");
  expect(hashBackupCode("abcd efgh")).toBe(hashBackupCode("ABCD-EFGH"));
  expect(hashBackupCode("ABCD-EFGH")).toMatch(/^[0-9a-f]{64}$/);
  expect(hashBackupCode("ABCD-EFGJ")).not.toBe(hashBackupCode("ABCD-EFGH"));
});

test("distinction code de secours / code TOTP", () => {
  expect(looksLikeBackupCode("123456")).toBe(false);
  expect(looksLikeBackupCode("abcd efgh")).toBe(true);
  expect(looksLikeBackupCode("ABCD-EFGH")).toBe(true);
  expect(looksLikeBackupCode("ABCD-EFG1")).toBe(false); // 1 n'est pas dans l'alphabet
  expect(looksLikeBackupCode("")).toBe(false);
  expect(looksLikeBackupCode(null)).toBe(false);
});
