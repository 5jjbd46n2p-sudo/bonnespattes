import { test, expect, mock } from "bun:test";
import * as RealReact from "react";

let dbUser;
// On garde le vrai React (d'autres fichiers de test font du rendu dans le même
// processus) et on neutralise seulement cache().
mock.module("react", () => ({ ...RealReact, default: RealReact, cache: (fn) => fn }));
mock.module("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "jeton" }) }) }));
mock.module("next/navigation", () => ({
  redirect: (to) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));
mock.module("jsonwebtoken", () => ({
  default: { verify: () => ({ userId: "u1", role: dbUser.role, sv: 0 }), sign: () => "" },
}));
mock.module("bcryptjs", () => ({ default: {} }));
mock.module("../lib/db.js", () => ({ query: async () => ({ rows: [dbUser] }) }));
process.env.JWT_SECRET = "x".repeat(32);

const { clientPageGuard, requireClient } = await import("../lib/auth.js");

test("client au mot de passe provisoire : page -> /compte/mot-de-passe", async () => {
  dbUser = { id: "u1", role: "CLIENT", session_version: 0, must_change_password: true };
  await expect(clientPageGuard()).rejects.toThrow("REDIRECT /compte/mot-de-passe");
});

test("client au mot de passe provisoire : API refusée", async () => {
  dbUser = { id: "u1", role: "CLIENT", session_version: 0, must_change_password: true };
  expect(await requireClient()).toBe(null);
});

test("client normal : accès", async () => {
  dbUser = { id: "u1", role: "CLIENT", session_version: 0, must_change_password: false };
  expect((await clientPageGuard()).id).toBe("u1");
});

test("admin sur une page client -> /login", async () => {
  dbUser = { id: "u1", role: "ADMIN", session_version: 0, must_change_password: false };
  await expect(clientPageGuard()).rejects.toThrow("REDIRECT /login");
});
