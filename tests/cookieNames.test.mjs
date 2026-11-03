import { test, expect, mock } from "bun:test";
import { cookieNames, LEGACY_COOKIE_NAMES } from "../lib/cookieNames.js";

test("production : préfixe __Host-", () => {
  expect(cookieNames(true)).toEqual({ session: "__Host-petsitter_session", mfa: "__Host-petsitter_mfa" });
});

test("développement (http) : anciens noms lisibles", () => {
  expect(cookieNames(false)).toEqual({ session: "petsitter_session", mfa: "petsitter_mfa" });
  expect(LEGACY_COOKIE_NAMES).toEqual(["petsitter_session", "petsitter_mfa"]);
});

// Effacement : mêmes attributs qu'à la création (path /, secure selon l'environnement),
// sans attribut domain — condition pour qu'un navigateur accepte d'effacer un cookie __Host-.
test("déconnexion : cookies expirés avec path / et sans domain", async () => {
  const calls = [];
  const jar = new Map([["petsitter_session", "ancien"]]);
  mock.module("next/headers", () => ({
    cookies: async () => ({
      get: (n) => (jar.has(n) ? { value: jar.get(n) } : undefined),
      set: (n, v, o) => calls.push({ op: "set", n, v, o }),
      delete: (n) => calls.push({ op: "delete", n }),
    }),
  }));
  mock.module("react", () => ({ cache: (fn) => fn }));
  mock.module("next/navigation", () => ({ redirect: () => {} }));
  mock.module("jsonwebtoken", () => ({ default: { sign: () => "jeton", verify: () => ({}) } }));
  mock.module("bcryptjs", () => ({ default: {} }));
  mock.module("../lib/db.js", () => ({ query: async () => ({ rows: [] }) }));
  const { clearSessionCookie } = await import("../lib/auth.js");
  await clearSessionCookie();
  const expired = calls.filter((c) => c.op === "set");
  expect(expired.length).toBeGreaterThanOrEqual(2);
  for (const c of expired) {
    expect(c.v).toBe("");
    expect(c.o.maxAge).toBe(0);
    expect(c.o.path).toBe("/");
    expect(c.o.domain).toBeUndefined();
    expect(c.o.secure).toBe(process.env.NODE_ENV === "production");
  }
});
