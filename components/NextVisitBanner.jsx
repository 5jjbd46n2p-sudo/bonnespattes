"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { wazeUrl } from "@/lib/utils";

function toMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function formatDuration(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

/**
 * Bandeau "Prochaine visite dans 20 min — Médor chez Dupont" en haut de
 * l'écran Aujourd'hui. Calculé côté navigateur (heure du téléphone) et
 * rafraîchi toutes les 30 secondes.
 */
export default function NextVisitBanner({ visits }) {
  const [nowMin, setNowMin] = useState(null);

  useEffect(() => {
    const update = () => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);

  if (nowMin === null) return null;

  const inProgress = visits.find((v) => v.status === "EN_COURS");
  const upcoming = visits
    .filter((v) => v.status === "PLANIFIE")
    .sort((a, b) => (toMinutes(a.start_time) ?? 9999) - (toMinutes(b.start_time) ?? 9999));
  const visit = inProgress || upcoming[0];
  if (!visit) return null;

  let headline;
  let tone = "bg-forest text-white";
  if (inProgress) {
    headline = "🐾 Visite en cours";
    tone = "bg-blue-600 text-white";
  } else {
    const start = toMinutes(visit.start_time);
    if (start === null) headline = "Prochaine visite (sans horaire)";
    else if (start - nowMin > 0) headline = `Prochaine visite dans ${formatDuration(start - nowMin)}`;
    else if (start - nowMin === 0) headline = "Prochaine visite : maintenant";
    else {
      headline = `En retard de ${formatDuration(nowMin - start)}`;
      tone = "bg-orange-700 text-white";
    }
  }

  return (
    <div className={`rounded-2xl p-4 sm:p-5 ${tone} shadow-sm`}>
      <p className="text-xs uppercase tracking-wide font-semibold opacity-80">{headline}</p>
      <p className="font-display text-xl sm:text-2xl font-semibold mt-1">
        {visit.pet_name} — chez {visit.first_name} {visit.last_name}
      </p>
      <p className="text-sm opacity-85 mt-0.5">
        {visit.start_time ? `${visit.start_time.slice(0, 5)}${visit.end_time ? ` – ${visit.end_time.slice(0, 5)}` : ""}` : "Horaire libre"}
        {visit.address ? ` · ${visit.address}` : ""}
      </p>
      <div className="flex gap-2 mt-3 flex-wrap">
        {visit.address && (
          <a
            href={wazeUrl(visit.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center min-h-[40px] px-4 rounded-full bg-white/20 hover:bg-white/30 text-sm font-semibold"
          >
            🧭 Y aller avec Waze
          </a>
        )}
        <Link
          href={`/admin/visits/${visit.id}`}
          className="inline-flex items-center min-h-[40px] px-4 rounded-full bg-white/20 hover:bg-white/30 text-sm font-semibold"
        >
          Ouvrir la visite
        </Link>
      </div>
    </div>
  );
}
