"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

/**
 * Recherche globale (clients, animaux, adresses) accessible partout dans
 * l'espace admin.
 * - variant "sidebar" : faux champ dans la barre latérale (ordinateur), + raccourci ⌘K / Ctrl+K
 * - variant "icon"    : bouton loupe dans l'en-tête mobile
 */
export default function GlobalSearch({ variant = "icon" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState({ clients: [], pets: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Raccourci clavier (uniquement sur la version ordinateur, pour ne pas
  // ouvrir deux fenêtres de recherche à la fois)
  useEffect(() => {
    if (variant !== "sidebar") return;
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Recherche avec un petit délai pour ne pas interroger le serveur à chaque lettre
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults({ clients: [], pets: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        const data = await res.json();
        if (res.ok) setResults({ clients: data.clients || [], pets: data.pets || [] });
      } catch {
        // requête annulée ou réseau indisponible : on garde les résultats précédents
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [q]);

  function go(href) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  const items = [
    ...results.clients.map((c) => ({
      key: `c-${c.id}`,
      href: `/admin/clients/${c.id}`,
      icon: "👤",
      title: `${c.first_name} ${c.last_name}`,
      sub: c.address || c.phone || "",
    })),
    ...results.pets.map((p) => ({
      key: `p-${p.id}`,
      href: `/admin/clients/${p.client_id}`,
      icon: "🐾",
      title: p.name,
      sub: `${p.species ? p.species + " · " : ""}chez ${p.first_name} ${p.last_name}`,
    })),
  ];

  return (
    <>
      {variant === "sidebar" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm text-white/75"
        >
          <span>🔍</span>
          <span className="flex-1 text-left">Rechercher…</span>
          <kbd className="text-[10px] font-semibold border border-white/25 rounded px-1.5 py-0.5">⌘K</kbd>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Rechercher"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-lg"
        >
          🔍
        </button>
      )}

      {open &&
        createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-3 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-24" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Recherche"
            className="w-full max-w-lg card shadow-2xl overflow-hidden text-ink"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 p-3 border-b border-border">
              <span className="pl-1">🔍</span>
              <input
                ref={inputRef}
                className="flex-1 bg-transparent outline-none text-base py-1.5"
                placeholder="Client, animal, adresse, téléphone…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && items[0]) go(items[0].href);
                }}
                enterKeyHint="search"
              />
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-forest font-medium px-2">
                Annuler
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {q.trim().length < 2 ? (
                <p className="px-4 py-6 text-sm text-muted text-center">Tape au moins 2 lettres.</p>
              ) : loading && items.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted text-center">Recherche…</p>
              ) : items.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted text-center">Aucun résultat.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {items.map((it) => (
                    <li key={it.key}>
                      <button
                        type="button"
                        onClick={() => go(it.href)}
                        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-sand-dark/60 active:bg-sand-dark"
                      >
                        <span className="text-lg">{it.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium truncate">{it.title}</span>
                          {it.sub && <span className="block text-xs text-muted truncate">{it.sub}</span>}
                        </span>
                        <span className="text-muted">›</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>,
          document.body
        )}
    </>
  );
}
