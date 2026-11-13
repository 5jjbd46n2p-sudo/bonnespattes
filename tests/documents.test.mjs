import { test, expect } from "bun:test";
import { DAILY_PHRASES, dayIndex, phraseOfDay } from "../lib/dailyPhrases.js";
import { DOCUMENTS, getDocument, checklistIds, progressOf } from "../lib/documents.js";

test("365 phrases du jour, toutes différentes et non vides", () => {
  expect(DAILY_PHRASES.length).toBe(365);
  expect(new Set(DAILY_PHRASES).size).toBe(365);
  for (const p of DAILY_PHRASES) {
    expect(p.trim().length).toBeGreaterThan(10);
    expect(p.length).toBeLessThanOrEqual(120);
  }
});

test("la phrase dépend de la date et revient l'année suivante", () => {
  expect(dayIndex("2026-01-01")).toBe(0);
  expect(dayIndex("2026-12-31")).toBe(364);
  expect(dayIndex("2026-03-01")).toBe(59);
  expect(phraseOfDay("2026-11-13")).toBe(phraseOfDay("2027-11-13"));
  expect(phraseOfDay("2026-11-13")).not.toBe(phraseOfDay("2026-11-14"));
});

test("année bissextile : le 29 février reprend le 28, le 1er mars ne bouge pas", () => {
  expect(dayIndex("2028-02-29")).toBe(dayIndex("2028-02-28"));
  expect(dayIndex("2028-03-01")).toBe(59);
  expect(dayIndex("2028-12-31")).toBe(364);
});

test("date illisible : première phrase, sans erreur", () => {
  expect(phraseOfDay("")).toBe(DAILY_PHRASES[0]);
  expect(phraseOfDay(undefined)).toBe(DAILY_PHRASES[0]);
});

test("documents : identifiants de checklist uniques dans chaque document", () => {
  expect(DOCUMENTS.length).toBe(2);
  for (const doc of DOCUMENTS) {
    const ids = checklistIds(doc);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{3,40}$/);
  }
  expect(getDocument("business-plan").title).toBe("Business plan");
  expect(getDocument("inconnu")).toBe(null);
});

test("avancement : ignore les identifiants inconnus", () => {
  const doc = getDocument("business-plan");
  const ids = checklistIds(doc);
  expect(progressOf(doc, []).percent).toBe(0);
  expect(progressOf(doc, ids).percent).toBe(100);
  expect(progressOf(doc, [ids[0], "ancien-id"]).done).toBe(1);
});

const { planTasks } = await import("../lib/planTasks.js");

test("tâches du planning : dates valides, types connus, pas de doublon entre les deux plans", () => {
  const kinds = ["RENCONTRE", "DEVIS", "FACTURATION", "COURSES", "AUTRE"];
  const seen = new Set();
  for (const slug of ["business-plan", "plan-marketing"]) {
    const tasks = planTasks(slug);
    expect(tasks.length).toBeGreaterThan(40);
    for (const t of tasks) {
      expect(new Date(`${t.date}T00:00:00Z`).toISOString().slice(0, 10)).toBe(t.date);
      expect(kinds).toContain(t.kind);
      expect(t.title.length).toBeGreaterThan(3);
      expect(t.title.length).toBeLessThanOrEqual(120);
      expect(t.notes.length).toBeLessThanOrEqual(1000);
      const key = `${t.date}|${t.title}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  }
  expect(planTasks("inconnu")).toEqual([]);
});
