"use client";

import { useSyncExternalStore } from "react";

const OPTIONS = [
  { value: "auto", label: "Auto", icon: "🌓" },
  { value: "light", label: "Clair", icon: "☀️" },
  { value: "dark", label: "Sombre", icon: "🌙" },
];

// Choix du thème : "Auto" suit le réglage du téléphone/ordinateur, sinon clair
// ou sombre forcé. Mémorisé dans un cookie (lu par le serveur pour afficher
// directement le bon thème, sans flash au chargement).
// Le thème courant est lu directement sur <html data-theme> : toutes les
// instances du sélecteur (barre latérale + Réglages) restent synchronisées.
function readTheme() {
  const t = document.documentElement.dataset.theme;
  return t === "dark" || t === "light" ? t : "auto";
}

function subscribe(onChange) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function applyTheme(value) {
  const root = document.documentElement;
  if (value === "auto") delete root.dataset.theme;
  else root.dataset.theme = value;
  document.cookie = `theme=${value}; path=/; max-age=31536000; samesite=lax`;
}

export default function ThemeToggle({ compact = false }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "auto");

  return (
    <div
      role="radiogroup"
      aria-label="Thème d'affichage"
      className={`inline-flex rounded-full border p-0.5 ${
        compact ? "border-white/20 bg-white/10 text-xs" : "border-border bg-sand-dark/40 text-sm"
      }`}
    >
      {OPTIONS.map((o) => {
        const active = theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => applyTheme(o.value)}
            title={o.label}
            className={`rounded-full font-medium transition-colors ${compact ? "px-2.5 py-1" : "px-3.5 py-1.5"} ${
              active
                ? compact
                  ? "bg-white/25 text-white"
                  : "bg-forest text-white"
                : compact
                ? "text-white/70"
                : "text-muted"
            }`}
          >
            {compact ? o.icon : `${o.icon} ${o.label}`}
          </button>
        );
      })}
    </div>
  );
}
