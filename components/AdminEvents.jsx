"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash, MapPin, Car, PencilSimple, Repeat } from "@phosphor-icons/react";
import { ADMIN_EVENT_KINDS, adminKindLabel, adminKindColor } from "@/lib/adminEvents";
import { WEEKDAYS_FR, generateWeeklyRecurrenceDates, isoWeekday, formatDateFR } from "@/lib/utils";

const hhmm = (t) => (t ? String(t).slice(0, 5) : "");

// Formulaire partagé : création (avec répétition) et modification.
function EventForm({ mode, date, clients, initial, isSeries, onDone, onCancel }) {
  const router = useRouter();
  const editing = mode === "edit";
  const [kind, setKind] = useState(initial?.kind || "RENCONTRE");
  const [title, setTitle] = useState(initial?.title || "");
  const [clientId, setClientId] = useState(initial?.client_id || "");
  const [startTime, setStartTime] = useState(hhmm(initial?.start_time));
  const [endTime, setEndTime] = useState(hhmm(initial?.end_time));
  const [place, setPlace] = useState(initial?.place || "");
  const [km, setKm] = useState(initial && Number(initial.travel_km) > 0 ? String(Number(initial.travel_km)) : "");
  const [minutes, setMinutes] = useState(initial && Number(initial.travel_minutes) > 0 ? String(initial.travel_minutes) : "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [day, setDay] = useState(date);
  const [scope, setScope] = useState("this");
  const [repeat, setRepeat] = useState(false);
  const [weekdays, setWeekdays] = useState([]);
  const [weeks, setWeeks] = useState(4);
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

  function toggleRepeat(checked) {
    setRepeat(checked);
    if (checked && weekdays.length === 0) setWeekdays([isoWeekday(day)]);
  }
  function toggleDay(d) {
    setWeekdays((list) => (list.includes(d) ? list.filter((x) => x !== d) : [...list, d].sort((a, b) => a - b)));
  }
  const repeatDates = repeat ? generateWeeklyRecurrenceDates(day, weekdays, Number(weeks) || 1) : [];

  async function submit(e) {
    e.preventDefault();
    if (repeat && weekdays.length === 0) {
      setError("Choisis au moins un jour pour la répétition.");
      return;
    }
    setBusy(true);
    setError("");
    const payload = {
      date: day,
      kind,
      title,
      clientId: clientId || null,
      startTime: startTime || null,
      endTime: endTime || null,
      place,
      travelKm: String(km).replace(",", "."),
      travelMinutes: minutes,
      notes,
    };
    let res;
    if (editing) {
      res = await fetch(`/api/admin-events/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, scope }),
      });
    } else {
      res = await fetch("/api/admin-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, recurrence: repeat ? { weekdays, weeks: Number(weeks) || 1 } : undefined }),
      });
    }
    if (res.ok) {
      onDone();
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Enregistrement impossible.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3">
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
        <span className="label">Libellé</span>
        <input required maxLength={120} className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Facturation de la semaine" />
      </label>
      {editing && (
        <label className="block">
          <span className="label">Date</span>
          <input type="date" required className="input mt-1" value={day} onChange={(e) => setDay(e.target.value)} />
        </label>
      )}
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
        <span className="label">Description (facultatif)</span>
        <textarea rows={3} maxLength={1000} className="input mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      {!editing && (
        <div className="rounded-lg border border-trait p-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={repeat} onChange={(e) => toggleRepeat(e.target.checked)} />
            <span className="text-sm font-bold">Répéter (semaine type)</span>
          </label>
          {repeat && (
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-sm font-bold mb-1.5">Jours de la semaine type</p>
                <div className="flex gap-1.5">
                  {WEEKDAYS_FR.map((d) => {
                    const active = weekdays.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleDay(d.value)}
                        aria-pressed={active}
                        title={d.label}
                        className={`weekday-pill ${active ? "weekday-pill--active" : ""}`}
                      >
                        {d.short}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold">Nombre de semaines</span>
                <div className="stepper">
                  <button type="button" onClick={() => setWeeks((w) => Math.max(1, Number(w) - 1))} aria-label="Moins de semaines">
                    –
                  </button>
                  <span>{weeks}</span>
                  <button type="button" onClick={() => setWeeks((w) => Math.min(26, Number(w) + 1))} aria-label="Plus de semaines">
                    +
                  </button>
                </div>
              </div>
              <p className="text-[13px] text-pierre">
                {repeatDates.length === 0
                  ? "Choisis au moins un jour."
                  : `${repeatDates.length} occurrence${repeatDates.length > 1 ? "s" : ""}, du ${formatDateFR(repeatDates[0])} au ${formatDateFR(
                      repeatDates[repeatDates.length - 1]
                    )}.`}
              </p>
            </div>
          )}
        </div>
      )}

      {editing && isSeries && (
        <fieldset className="rounded-lg border border-trait p-3 space-y-1.5">
          <legend className="text-sm font-bold px-1">Cet événement fait partie d'une série</legend>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" name="scope" checked={scope === "this"} onChange={() => setScope("this")} />
            Modifier seulement celui-ci
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" name="scope" checked={scope === "following"} onChange={() => setScope("following")} />
            Modifier celui-ci et les suivants
          </label>
        </fieldset>
      )}

      {error && <p role="alert" className="text-sm font-bold text-brique">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn-primary text-sm">
          {busy ? "..." : editing ? "Enregistrer" : repeat && repeatDates.length > 1 ? `Ajouter les ${repeatDates.length} occurrences` : "Ajouter au planning"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost text-sm">
          Annuler
        </button>
      </div>
    </form>
  );
}

export default function AdminEventAdd({ date, clients }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-3">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="btn-ghost text-sm gap-2">
          <Plus size={20} aria-hidden="true" />
          Ajouter un rendez-vous ou une tâche
        </button>
      ) : (
        <EventForm mode="add" date={date} clients={clients} onDone={() => setOpen(false)} onCancel={() => setOpen(false)} />
      )}
    </div>
  );
}

// Ligne d'un rendez-vous ou d'une tâche administrative dans l'agenda du jour.
export function AdminEventRow({ event: ev, clients = [] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const isSeries = Boolean(ev.recurrence_id);

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
    let scope = "this";
    if (isSeries) {
      if (confirm(`« ${ev.title} » fait partie d'une série.\n\nOK : supprimer celui-ci et tous les suivants.\nAnnuler : choisir de ne supprimer que celui-ci.`)) {
        scope = "following";
      } else if (!confirm(`Supprimer seulement « ${ev.title} » de ce jour ?`)) {
        return;
      }
    } else if (!confirm(`Supprimer « ${ev.title} » ?`)) {
      return;
    }
    setBusy(true);
    await fetch(`/api/admin-events/${ev.id}?scope=${scope}`, { method: "DELETE" });
    router.refresh();
    setBusy(false);
  }

  if (editing) {
    return (
      <div className="p-3 bg-lin">
        <EventForm
          mode="edit"
          date={ev.date}
          clients={clients}
          initial={ev}
          isSeries={isSeries}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
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
          {isSeries && <Repeat size={16} aria-label="Série récurrente" className="text-pierre" />}
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
        onClick={() => setEditing(true)}
        disabled={busy}
        aria-label={`Modifier ${ev.title}`}
        className="text-pierre p-1 rounded-lg hover:bg-sable"
      >
        <PencilSimple size={20} aria-hidden="true" />
      </button>
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
