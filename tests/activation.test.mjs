import { test, expect } from "bun:test";
import {
  newActivationToken,
  hashActivationToken,
  activationExpiry,
  isActivationUsable,
  looksLikeActivationToken,
  ACTIVATION_TTL_HOURS,
} from "../lib/activation.js";

test("jeton : 32 octets aléatoires en base64url, empreinte SHA-256 stockée", () => {
  const a = newActivationToken();
  const b = newActivationToken();
  expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(a.token).not.toBe(b.token);
  expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
  expect(a.hash).toBe(hashActivationToken(a.token));
  expect(a.hash).not.toContain(a.token);
});

test("durée de validité : 72 h", () => {
  expect(ACTIVATION_TTL_HOURS).toBe(72);
  const now = new Date("2026-11-03T10:00:00Z");
  expect(activationExpiry(now).toISOString()).toBe("2026-11-06T10:00:00.000Z");
});

test("utilisable : ni utilisé, ni expiré", () => {
  const now = new Date("2026-11-03T10:00:00Z");
  const ok = { used_at: null, expires_at: "2026-11-04T10:00:00Z" };
  expect(isActivationUsable(ok, now)).toBe(true);
  expect(isActivationUsable({ ...ok, used_at: "2026-11-03T09:00:00Z" }, now)).toBe(false);
  expect(isActivationUsable({ ...ok, expires_at: "2026-11-03T09:59:59Z" }, now)).toBe(false);
  expect(isActivationUsable(null, now)).toBe(false);
});

test("format du jeton vérifié avant toute requête", () => {
  expect(looksLikeActivationToken(newActivationToken().token)).toBe(true);
  expect(looksLikeActivationToken("abc")).toBe(false);
  expect(looksLikeActivationToken("x".repeat(43) + "!")).toBe(false);
  expect(looksLikeActivationToken(undefined)).toBe(false);
});
