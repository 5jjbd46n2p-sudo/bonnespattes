"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { wazeUrl } from "@/lib/utils";
import { VisitStatusBadge, VISIT_STATUS } from "@/components/StatusBadge";
import { Camera, Check, ListChecks, Navigation, Play } from "lucide-react";

const SWIPE_THRESHOLD = 90; // px à parcourir pour valider l'action du glissement
const SWIPE_MAX = 160;

/**
 * Carte de visite partagée (accueil "Aujourd'hui" + agenda du planning) :
 * - boutons rapides "Démarrer" / "Terminer" sans ouvrir la visite,
 * - glisser vers la droite = démarrer, vers la gauche = terminer (mobile),
 * - bouton appareil photo pour ajouter une photo en un geste,
 * - couleur de statut identique partout (liseré + badge).
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

  const meta = VISIT_STATUS[status];
  const time = visit.start_time
    ? `${visit.start_time.slice(0, 5)}${visit.end_time ? ` - ${visit.end_time.slice(0, 5)}` : ""}`
    : "Horaire libre";
  const pastThreshold = Math.abs(dx) >= SWIPE_THRESHOLD;

  return (
    <div className="relative rounded-xl overflow-hidden">
      {dx !== 0 && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 flex items-center px-5 text-white font-semibold text-sm ${
            dx > 0 ? "justify-start bg-amber-500" : "justify-end bg-emerald-600"
          } ${pastThreshold ? "" : "opacity-70"}`}
        >
          {dx > 0 ? (canStart ? "Démarrer" : "") : canFinish ? "Terminer" : ""}
        </div>
      )}

      <div
        className={`card border-l-4 ${meta?.border || "border-l-stone-300"} p-4 relative ${
          status === "ANNULE" ? "opacity-70" : ""
        }`}
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
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-muted tabular-nums">{time}</span>
              <VisitStatusBadge status={status} />
            </div>
            <Link href={`/admin/visits/${visit.id}`} className="block mt-1 font-semibold text-[1.05rem] hover:underline">
              {visit.pet_name}
              <span className="font-normal text-muted"> chez {visit.first_name} {visit.last_name}</span>
            </Link>
            <div className="text-sm text-muted mt-1.5 flex items-center gap-4 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <ListChecks className="w-4 h-4" strokeWidth={1.9} />
                {visit.task_done_count}/{visit.task_count} tâches
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Camera className="w-4 h-4" strokeWidth={1.9} />
                {photoCount} photo{photoCount > 1 ? "s" : ""}
              </span>
              {visit.address && (
                <a
                  href={wazeUrl(visit.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-forest font-medium hover:underline"
                >
                  <Navigation className="w-4 h-4" strokeWidth={1.9} />
                  Itinéraire
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canStart && (
              <button
                type="button"
                disabled={busy}
                onClick={() => changeStatus("EN_COURS")}
                className="btn-ghost !min-h-[40px] !py-1.5 !px-3 text-sm gap-1.5"
              >
                <Play className="w-3.5 h-3.5" strokeWidth={2.4} />
                Démarrer
              </button>
            )}
            {canFinish && (
              <button
                type="button"
                disabled={busy}
                onClick={() => changeStatus("FAIT")}
                className="btn-primary !min-h-[40px] !py-1.5 !px-3 text-sm gap-1.5"
              >
                <Check className="w-4 h-4" strokeWidth={2.4} />
                Terminer
              </button>
            )}
            {canPhoto && (
              <label
                className={`btn-ghost !min-h-[40px] !py-1.5 !px-3 text-sm cursor-pointer ${uploading ? "opacity-60" : ""}`}
                title="Ajouter une photo"
              >
                {uploading ? "Envoi…" : <Camera className="w-[18px] h-[18px]" strokeWidth={1.9} />}
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
            {!canStart && !canFinish && (
              <Link href={`/admin/visits/${visit.id}`} className="btn-ghost !min-h-[40px] !py-1.5 !px-3 text-sm">
                Voir le détail
              </Link>
            )}
          </div>
        </div>
        {error && <p className="text-sm text-danger mt-2">{error}</p>}
      </div>
    </div>
  );
}
