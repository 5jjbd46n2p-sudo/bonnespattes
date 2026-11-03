import { test, expect, mock } from "bun:test";

// Modules serveur indisponibles dans le bac à sable : simulés.
mock.module("react", () => ({ cache: (fn) => fn }));
mock.module("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set() {}, delete() {} }) }));
mock.module("next/navigation", () => ({ redirect: () => {} }));
mock.module("jsonwebtoken", () => ({ default: { sign: () => "", verify: () => ({}) } }));
mock.module("bcryptjs", () => ({ default: { hash: async (p) => `h(${p})`, compare: async () => false, getRounds: () => 12 } }));
mock.module("../lib/db.js", () => ({ query: async () => ({ rows: [] }), tx: async (fn) => fn({ query: async () => ({ rows: [] }) }) }));

const { activateWithToken } = await import("../lib/activationStore.js");
const { newActivationToken } = await import("../lib/activation.js");

// Base en mémoire : une ligne activation_tokens + un utilisateur.
function fakeDb({ expiresInMs = 3600_000, usedAt = null } = {}) {
  const { token, hash } = newActivationToken();
  const state = {
    tok: { id: "t1", user_id: "u1", token_hash: hash, expires_at: new Date(Date.now() + expiresInMs), used_at: usedAt },
    user: { id: "u1", email: "marie.dupont@exemple.fr", password_hash: "x", must_change_password: true, session_version: 3 },
  };
  const db = {
    async query(sql, params) {
      if (sql.includes("FROM activation_tokens a")) {
        return { rows: params[0] === state.tok.token_hash ? [{ ...state.tok, email: state.user.email }] : [] };
      }
      if (sql.startsWith("UPDATE activation_tokens")) {
        if (state.tok.used_at) return { rows: [] };
        state.tok.used_at = new Date();
        return { rows: [{ id: "t1" }] };
      }
      if (sql.trim().startsWith("UPDATE users")) {
        Object.assign(state.user, {
          password_hash: params[1],
          must_change_password: false,
          session_version: state.user.session_version + 1,
        });
        return { rows: [{ ...state.user }] };
      }
      throw new Error("requête inattendue : " + sql);
    },
  };
  const transaction = async (fn) => fn(db);
  return { token, state, deps: { transaction, hash: async (p) => `h(${p})` } };
}

const GOOD = "Croquettes-du-soir-42";

test("activation : mot de passe enregistré, jeton consommé, sessions révoquées", async () => {
  const { token, state, deps } = fakeDb();
  const r = await activateWithToken(token, GOOD, deps);
  expect(r.user.id).toBe("u1");
  expect(state.user.password_hash).toBe(`h(${GOOD})`);
  expect(state.user.must_change_password).toBe(false);
  expect(state.user.session_version).toBe(4);
  expect(state.tok.used_at).not.toBe(null);
});

test("usage unique : un second envoi du même lien est refusé", async () => {
  const { token, deps } = fakeDb();
  expect((await activateWithToken(token, GOOD, deps)).user).toBeDefined();
  expect(await activateWithToken(token, "Autre-mot-de-passe-77", deps)).toEqual({ error: "invalid" });
});

test("lien expiré refusé, rien n'est modifié", async () => {
  const { token, state, deps } = fakeDb({ expiresInMs: -1000 });
  expect(await activateWithToken(token, GOOD, deps)).toEqual({ error: "invalid" });
  expect(state.user.password_hash).toBe("x");
  expect(state.tok.used_at).toBe(null);
});

test("jeton inconnu refusé", async () => {
  const { deps } = fakeDb();
  expect(await activateWithToken(newActivationToken().token, GOOD, deps)).toEqual({ error: "invalid" });
});

test("mot de passe trop faible : message de règle, lien conservé", async () => {
  const { token, state, deps } = fakeDb();
  const r = await activateWithToken(token, "court", deps);
  expect(r.error).toMatch("12 caractères");
  expect(state.tok.used_at).toBe(null);
});
