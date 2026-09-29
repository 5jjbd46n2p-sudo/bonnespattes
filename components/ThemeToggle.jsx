"use client";

import { useSyncExternalStore } from "react";
import { CircleHalf, Sun, Moon } from "@phosphor-icons/react";

const OPTIONS = [
  { value: "auto", label: "Auto", icon: CircleHalf },
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
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
      className={`inline-flex rounded-lg border p-0.5 ${
        compact ? "border-white/20 bg-white/10 text-xs" : "border-trait bg-sable text-sm"
      }`}
    >
      {OPTIONS.map((o) => {
        const active = theme === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => applyTheme(o.value)}
            title={o.label}
            aria-label={o.label}
            className={`inline-flex items-center gap-1.5 rounded-md font-bold transition-colors ${compact ? "px-2.5 py-1" : "px-3.5 py-1.5"} ${
              active
                ? "bg-rouille text-sur-rouille"
                : compact
                ? "text-sur-nav/70"
                : "text-pierre"
            }`}
          >
            <Icon size={20} aria-hidden="true" />
            {!compact && o.label}
          </button>
        );
      })}
    </div>
  );
}
