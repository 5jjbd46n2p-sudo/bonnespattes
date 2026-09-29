"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, Check, CheckSquare, Camera, NavigationArrow } from "@phosphor-icons/react";
import { wazeUrl } from "@/lib/utils";
import { VisitStatusBadge } from "@/components/StatusBadge";

const SWIPE_THRESHOLD = 90; // px à parcourir pour valider l'action du glissement
const SWIPE_MAX = 160;

/**
 * Carte de visite partagée (accueil "Aujourd'hui" + agenda du planning) :
 * - boutons rapides "Démarrer" / "Terminer" sans ouvrir la visite,
 * - glisser vers la droite = démarrer, vers la gauche = terminer (mobile),
 * - bouton appareil photo pour ajouter une photo en un geste,
 * - couleur de statut identique partout (badge à pastille).
 * La carte est une ligne sur fond lin : à placer de préférence dans une
 * liste groupée (.list-group) pour obtenir des lignes séparées par un filet.
 */
export default function VisitCard({ visit }) {
  const router = useRouter();
  const [status, setStatus] = useState(visit.status);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoCount, setPhotoCount] = useState(Number(visit.photo_count) || 0);
  const [error, setError] = useState("");

  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touch = useRef(null);
  const swiped = useRef(false);
  const fileRef = useRef(null);

  const canStart = status === "PLANIFIE";
  const canFinish = status === "PLANIFIE" || status === "EN_COURS";
  const canPhoto = status !== "ANNULE";

  async function changeStatus(newStatus) {
    if (busy) return;
    const previous = status;
    setStatus(newStatus); // mise à jour immédiate, sans attendre le serveur
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/visits/${visit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setStatus(previous);
      setError("Impossible de changer le statut, réessaie.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadPhotos(files) {
    setUploading(true);
    setError("");
    let sent = 0;
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/visits/${visit.id}/photos`, { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Échec de l'envoi d'une photo.");
        break;
      }
      sent++;
    }
    setPhotoCount((n) => n + sent);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (sent) router.refresh();
  }

  // --- Glissement (swipe) -------------------------------------------------
  function onTouchStart(e) {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, dir: null };
    swiped.current = false;
  }

  function onTouchMove(e) {
    const s = touch.current;
    if (!s) return;
    const t = e.touches[0];
    const ddx = t.clientX - s.x;
    const ddy = t.clientY - s.y;
    if (!s.dir) {
      if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) return;
      s.dir = Math.abs(ddx) > Math.abs(ddy) ? "h" : "v";
    }
    if (s.dir !== "h") return;
    swiped.current = true;
    let v = ddx;
    // Résistance si l'action n'est pas disponible dans ce sens
    if (v > 0 && !canStart) v = v / 5;
    if (v < 0 && !canFinish) v = v / 5;
    setDragging(true);
    setDx(Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, v)));
  }

  function onTouchEnd() {
    const s = touch.current;
    touch.current = null;
    if (!s || s.dir !== "h") return;
    if (dx <= -SWIPE_THRESHOLD && canFinish) changeStatus("FAIT");
    else if (dx >= SWIPE_THRESHOLD && canStart) changeStatus("EN_COURS");
    setDragging(false);
    setDx(0);
  }

  // Empêche qu'un glissement déclenche aussi un clic sur un lien de la carte
  function onClickCapture(e) {
    if (swiped.current) {
      e.preventDefault();
      e.stopPropagation();
      swiped.current = false;
    }
  }

  const time = visit.start_time
    ? `${visit.start_time.slice(0, 5)}${visit.end_time ? `–${visit.end_time.slice(0, 5)}` : ""}`
    : "—";
  const pastThreshold = Math.abs(dx) >= SWIPE_THRESHOLD;

  return (
    <div className="relative overflow-hidden">
      {dx !== 0 && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 flex items-center gap-2 px-5 text-lin font-bold text-sm ${
            dx > 0 ? "justify-start bg-rouille" : "justify-end bg-mousse"
          } ${pastThreshold ? "" : "opacity-70"}`}
        >
          {dx > 0 ? (
            canStart && (
              <>
                <Play size={20} aria-hidden="true" />
                Démarrer
              </>
            )
          ) : (
            canFinish && (
              <>
                <Check size={20} aria-hidden="true" />
                Terminer
              </>
            )
          )}
        </div>
      )}

      <div
        className={`bg-lin p-4 relative ${status === "ANNULE" ? "opacity-70" : ""}`}
        style={{
          transform: dx ? `translateX(${dx}px)` : undefined,
          transition: dragging ? "none" : "transform 0.2s ease",
          touchAction: "pan-y",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onClickCapture={onClickCapture}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
          <div className="flex md:block items-center gap-3 md:w-24 shrink-0">
            <span className="font-bold text-encre tabular-nums">{time}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/admin/visits/${visit.id}`} className="font-bold hover:underline">
                {visit.pet_name} — {visit.first_name} {visit.last_name}
              </Link>
              <VisitStatusBadge status={status} />
            </div>
            <div className="text-sm text-pierre mt-1 flex items-center gap-4 flex-wrap">
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <CheckSquare size={20} aria-hidden="true" />
                {visit.task_done_count}/{visit.task_count} tâches
              </span>
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <Camera size={20} aria-hidden="true" />
                {photoCount} photo{photoCount > 1 ? "s" : ""}
              </span>
              {visit.address && (
                <a
                  href={wazeUrl(visit.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-bold text-rouille hover:text-rouille-fonce underline underline-offset-4"
                >
                  <NavigationArrow size={20} aria-hidden="true" />
                  Waze
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {canStart && (
              <button
                type="button"
                disabled={busy}
                onClick={() => changeStatus("EN_COURS")}
                className="btn-ghost !py-1.5 !px-3 text-sm"
              >
                <Play size={20} aria-hidden="true" />
                Démarrer
              </button>
            )}
            {canFinish && (
              <button
                type="button"
                disabled={busy}
                onClick={() => changeStatus("FAIT")}
                className="btn-primary !py-1.5 !px-3 text-sm"
              >
                <Check size={20} aria-hidden="true" />
                Terminer
              </button>
            )}
            {canPhoto && (
              <label
                className={`btn-ghost !py-1.5 !px-3 text-sm cursor-pointer ${uploading ? "opacity-60" : ""}`}
                title="Ajouter une photo"
              >
                {uploading ? "Envoi…" : <Camera size={20} aria-hidden="true" />}
                <span className="sr-only">Ajouter une photo</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => e.target.files?.length && uploadPhotos(Array.from(e.target.files))}
                />
              </label>
            )}
            <Link href={`/admin/visits/${visit.id}`} className="btn-ghost !py-1.5 !px-3 text-sm">
              Détail
            </Link>
          </div>
        </div>
        {error && <p className="text-sm text-brique mt-2">{error}</p>}
      </div>
    </div>
  );
}
