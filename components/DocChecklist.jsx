"use client";

import { useState } from "react";

// Checklist de suivi d'un document : chaque case est enregistrée dès qu'on la touche.
export default function DocChecklist({ slug, groups, initialDone = [] }) {
  const [done, setDone] = useState(() => new Set(initialDone));
  const [error, setError] = useState("");

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const count = groups.reduce((n, g) => n + g.items.filter((i) => done.has(i.id)).length, 0);
  const percent = total ? Math.round((count / total) * 100) : 0;

  async function toggle(id, checked) {
    setError("");
    const apply = (value) =>
      setDone((prev) => {
        const next = new Set(prev);
        if (value) next.add(id);
        else next.delete(id);
        return next;
      });
    apply(checked);
    try {
      const res = await fetch(`/api/documents/${slug}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: id, done: checked }),
      });
      if (!res.ok) throw new Error();
    } catch {
      apply(!checked);
      setError("La case n'a pas pu être enregistrée. Vérifie ta connexion et réessaie.");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-bold text-encre tabular-nums">
            {count} sur {total} étapes faites
          </p>
          <p className="text-sm text-pierre tabular-nums">{percent} %</p>
        </div>
        <div
          className="mt-2 h-2 rounded-full bg-sable overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={count}
          aria-label="Avancement de la checklist"
        >
          <div className="h-full bg-mousse" style={{ width: `${percent}%` }} />
        </div>
        {error && (
          <p role="alert" className="text-sm font-bold text-brique mt-2">
            {error}
          </p>
        )}
      </div>

      {groups.map((g) => {
        const groupDone = g.items.filter((i) => done.has(i.id)).length;
        return (
          <fieldset key={g.title}>
            <legend className="font-bold text-encre">
              {g.title}{" "}
              <span className="text-sm font-normal text-pierre tabular-nums">
                ({groupDone}/{g.items.length})
              </span>
            </legend>
            <ul className="mt-2 divide-y divide-trait border-y border-trait">
              {g.items.map((i) => {
                const checked = done.has(i.id);
                return (
                  <li key={i.id}>
                    <label className="flex items-start gap-3 py-3 cursor-pointer">
                      <input
                        type="checkbox"
                        id={`doc-${slug}-${i.id}`}
                        checked={checked}
                        onChange={(e) => toggle(i.id, e.target.checked)}
                        className="mt-0.5 w-5 h-5 shrink-0 accent-[var(--color-mousse)]"
                      />
                      <span className={checked ? "text-pierre line-through" : "text-encre"}>{i.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        );
      })}
    </div>
  );
}
