"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navigation } from "lucide-react";
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

  // Bandeau toujours aux couleurs de la marque ; seule la pastille d'état change.
  let headline;
  let chip = "bg-white/15 text-white";
  if (inProgress) {
    headline = "Visite en cours";
    chip = "bg-amber-400 text-amber-950";
  } else {
    const start = toMinutes(visit.start_time);
    if (start === null) headline = "Prochaine visite, sans horaire";
    else if (start - nowMin > 0) headline = `Prochaine visite dans ${formatDuration(start - nowMin)}`;
    else if (start - nowMin === 0) headline = "Prochaine visite maintenant";
    else {
      headline = `En retard de ${formatDuration(nowMin - start)}`;
      chip = "bg-red-500 text-white";
    }
  }

  return (
    <div className="rounded-xl p-4 sm:p-5 bg-nav text-white">
      <span className={`inline-block text-xs font-semibold rounded-full px-2.5 py-1 ${chip}`}>{headline}</span>
      <p className="font-display text-xl sm:text-2xl font-bold mt-2.5">
        {visit.pet_name}
        <span className="font-medium text-white/70"> chez {visit.first_name} {visit.last_name}</span>
      </p>
      <p className="text-sm text-white/70 mt-0.5">
        {visit.start_time ? `${visit.start_time.slice(0, 5)}${visit.end_time ? ` - ${visit.end_time.slice(0, 5)}` : ""}` : "Horaire libre"}
        {visit.address ? ` · ${visit.address}` : ""}
      </p>
      <div className="flex gap-2 mt-4 flex-wrap">
        {visit.address && (
          <a
            href={wazeUrl(visit.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-accent !min-h-[40px] !py-1.5 text-sm gap-1.5"
          >
            <Navigation className="w-4 h-4" strokeWidth={2} />
            Itinéraire
          </a>
        )}
        <Link
          href={`/admin/visits/${visit.id}`}
          className="inline-flex items-center min-h-[40px] px-4 rounded-[10px] bg-white/10 hover:bg-white/15 text-sm font-semibold"
        >
          Ouvrir la visite
        </Link>
      </div>
    </div>
  );
}
