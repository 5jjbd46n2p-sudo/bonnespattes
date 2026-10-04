"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash, MapPin, Car } from "@phosphor-icons/react";
import { ADMIN_EVENT_KINDS, adminKindLabel, adminKindColor } from "@/lib/adminEvents";

const hhmm = (t) => (t ? String(t).slice(0, 5) : "");

export default function AdminEventAdd({ date, clients }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("RENCONTRE");
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [place, setPlace] = useState("");
  const [km, setKm] = useState("");
  const [minutes, setMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Client choisi : adresse et trajet (aller-retour) préremplis depuis sa fiche.
  function pickClient(id) {
    setClientId(id);
    const c = clients.find((x) => x.id === id);
    if (!c) return;
    if (c.address && !place) setPlace(c.address);
    if (c.distance_km !== null && c.distance_km !== undefined && !km) setKm(String(Math.round(Number(c.distance_km) * 2 * 10) / 10));
    if (c.travel_minutes && !minutes) setMinutes(String(Number(c.travel_minutes) * 2));
    if (!title) setTitle(`${kind === "DEVIS" ? "Devis" : "Rendez-vous"} ${c.first_name} ${c.last_name}`.trim());
  }

  function reset() {
    setTitle("");
    setClientId("");
    setStartTime("");
    setEndTime("");
    setPlace("");
    setKm("");
    setMinutes("");
    setNotes("");
  }

  async function add(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        kind,
        title,
        clientId: clientId || null,
        startTime: startTime || null,
        endTime: endTime || null,
        place,
        travelKm: String(km).replace(",", "."),
        travelMinutes: minutes,
        notes,
      }),
    });
    if (res.ok) {
      reset();
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Ajout impossible.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      {!open && (
        <button type="button" onClick={() => setOpen(true)} className="btn-ghost text-sm gap-2">
          <Plus size={20} aria-hidden="true" />
          Ajouter un rendez-vous ou une tâche
        </button>
      )}

      {open && (
        <form onSubmit={add} className="card p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">Type</span>
              <select className="input mt-1" value={kind} onChange={(e) => setKind(e.target.value)}>
                {ADMIN_EVENT_KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Client (facultatif)</span>
              <select className="input mt-1" value={clientId} onChange={(e) => pickClient(e.target.value)}>
                <option value="">—</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="label">Titre</span>
            <input required maxLength={120} className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Rencontre avec Mme Loosen" />
          </label>
          <div className="grid gap-3 grid-cols-2">
            <label className="block">
              <span className="label">Début</span>
              <input type="time" className="input mt-1" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </label>
            <label className="block">
              <span className="label">Fin</span>
              <input type="time" className="input mt-1" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </label>
          </div>
          <label className="block">
            <span className="label">Lieu</span>
            <input maxLength={200} className="input mt-1" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Adresse ou lieu (facultatif)" />
          </label>
          <div className="grid gap-3 grid-cols-2">
            <label className="block">
              <span className="label">Trajet aller-retour (km)</span>
              <input inputMode="decimal" className="input mt-1" value={km} onChange={(e) => setKm(e.target.value)} placeholder="0" />
            </label>
            <label className="block">
              <span className="label">Durée du trajet (min)</span>
              <input inputMode="numeric" className="input mt-1" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="0" />
            </label>
          </div>
          <label className="block">
            <span className="label">Notes (facultatif)</span>
            <textarea rows={2} maxLength={1000} className="input mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          {error && <p role="alert" className="text-sm font-bold text-brique">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn-primary text-sm">
              {busy ? "..." : "Ajouter au planning"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-sm">
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// Ligne d'un rendez-vous ou d'une tâche administrative dans l'agenda du jour.
export function AdminEventRow({ event: ev }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggleDone() {
    setBusy(true);
    await fetch(`/api/admin-events/${ev.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !ev.done }),
    });
    router.refresh();
    setBusy(false);
  }

  async function remove() {
    if (!confirm(`Supprimer « ${ev.title} » ?`)) return;
    setBusy(true);
    await fetch(`/api/admin-events/${ev.id}`, { method: "DELETE" });
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="bg-lin p-4 flex items-start gap-3 border-l-4" style={{ borderLeftColor: adminKindColor(ev.kind) }}>
      <input
        type="checkbox"
        checked={ev.done}
        disabled={busy}
        onChange={toggleDone}
        aria-label={`Marquer « ${ev.title} » comme fait`}
        className="mt-1.5"
      />
      <div className={`flex-1 min-w-0 ${ev.done ? "opacity-60" : ""}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold tabular-nums">{ev.start_time ? hhmm(ev.start_time) : "Sans heure"}</span>
          <span
            className="inline-flex items-center gap-1.5 text-[13px] font-bold px-2 py-0.5 rounded-full border border-trait"
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: adminKindColor(ev.kind) }} aria-hidden="true" />
            {adminKindLabel(ev.kind)}
          </span>
        </div>
        <p className={`font-bold mt-1 ${ev.done ? "line-through" : ""}`}>
          {ev.title}
          {ev.end_time ? <span className="font-normal text-pierre tabular-nums"> (jusqu'à {hhmm(ev.end_time)})</span> : null}
        </p>
        {ev.client_name && <p className="text-sm text-pierre">{ev.client_name}</p>}
        {ev.place && (
          <p className="text-sm text-pierre flex items-center gap-1">
            <MapPin size={16} aria-hidden="true" className="shrink-0" />
            <span className="truncate">{ev.place}</span>
          </p>
        )}
        {(Number(ev.travel_km) > 0 || Number(ev.travel_minutes) > 0) && (
          <p className="text-sm text-pierre flex items-center gap-1 tabular-nums">
            <Car size={16} aria-hidden="true" className="shrink-0" />
            {Number(ev.travel_km) > 0 ? `${Number(ev.travel_km)} km` : ""}
            {Number(ev.travel_km) > 0 && Number(ev.travel_minutes) > 0 ? ", " : ""}
            {Number(ev.travel_minutes) > 0 ? `${ev.travel_minutes} min` : ""} (aller-retour)
          </p>
        )}
        {ev.notes && <p className="text-sm mt-1 whitespace-pre-line">{ev.notes}</p>}
      </div>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        aria-label={`Supprimer ${ev.title}`}
        className="text-brique p-1 rounded-lg hover:bg-sable"
      >
        <Trash size={20} aria-hidden="true" />
      </button>
    </div>
  );
}
