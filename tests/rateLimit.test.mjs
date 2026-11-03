import { test, expect, mock } from "bun:test";

// Base simulée : chaque instruction est asynchrone (comme le réseau), pour
// reproduire des requêtes parallèles qui s'entrelacent.
const rows = [];
mock.module("../lib/db.js", () => ({
  query: async (sql, params) => {
    await new Promise((r) => setTimeout(r, Math.random() * 5));
    if (sql.startsWith("INSERT INTO rate_limit_hits")) {
      rows.push({ bucket: params[0], key_hash: params[1] });
      return { rows: [] };
    }
    if (sql.includes("COUNT(*)")) {
      const n = rows.filter((r) => r.bucket === params[0] && r.key_hash === params[1]).length;
      return { rows: [{ n }] };
    }
    if (sql.startsWith("DELETE FROM rate_limit_hits")) {
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i].bucket === params[0] && rows[i].key_hash === params[1]) rows.splice(i, 1);
      }
      return { rows: [] };
    }
    throw new Error("requête inattendue : " + sql);
  },
  tx: async () => {
    throw new Error("tx non simulé dans ce test");
  },
}));

const { consumeAttempt, clearAttempts } = await import("../lib/security.js");
const LIMIT = { limit: 6, windowSeconds: 900 };

test("6 essais autorisés, le 7e refusé", async () => {
  const res = [];
  for (let i = 0; i < 7; i++) res.push(await consumeAttempt("t-seq", "a@b.fr|1.2.3.4", LIMIT));
  expect(res).toEqual([true, true, true, true, true, true, false]);
});

test("50 essais en parallèle : jamais plus de 6 autorisés", async () => {
  const res = await Promise.all(
    Array.from({ length: 50 }, () => consumeAttempt("t-par", "a@b.fr|1.2.3.4", LIMIT))
  );
  expect(res.filter(Boolean).length).toBeLessThanOrEqual(6);
});

test("clé sans compte existant : même traitement (la clé ne dépend que de l'email et de l'IP)", async () => {
  const res = [];
  for (let i = 0; i < 7; i++) res.push(await consumeAttempt("t-unknown", "inconnu@x.fr|1.2.3.4", LIMIT));
  expect(res[6]).toBe(false);
});

test("clearAttempts remet le compteur à zéro", async () => {
  for (let i = 0; i < 7; i++) await consumeAttempt("t-clear", "k", LIMIT);
  await clearAttempts("t-clear", "k");
  expect(await consumeAttempt("t-clear", "k", LIMIT)).toBe(true);
});
