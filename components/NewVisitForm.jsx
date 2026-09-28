"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  computeVisitHours,
  generateWeeklyRecurrenceDates,
  isoWeekday,
  WEEKDAYS_FR,
  formatDateFR,
} from "@/lib/utils";

const DEFAULT_TASKS = ["Nourrir", "Promenade", "Eau fraîche", "Litière / propreté", "Câlins & jeu"];

export default function NewVisitForm({ client, pets, initialDate }) {
  const router = useRouter();
  const [petId, setPetId] = useState(pets[0]?.id || "");
  const [date, setDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [price, setPrice] = useState(client.hourly_rate || "");
  const [priceEdited, setPriceEdited] = useState(false);
  const [notes, setNotes] = useState("");
  const [tasks, setTasks] = useState([...DEFAULT_TASKS]);
  const [newTask, setNewTask] = useState("");
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceDays, setRecurrenceDays] = useState([]);
  const [recurrenceWeeks, setRecurrenceWeeks] = useState(4);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const hours = computeVisitHours(startTime, endTime);

  function toggleRecurrence(checked) {
    setRecurrenceEnabled(checked);
    // Pré-coche le jour de la date choisie pour démarrer la "semaine type",
    // le reste se personnalise en cliquant sur les autres jours.
    if (checked && recurrenceDays.length === 0) {
      setRecurrenceDays([isoWeekday(date)]);
    }
  }

  function toggleDay(day) {
    setRecurrenceDays((days) =>
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort((a, b) => a - b)
    );
  }

  const recurrenceDates = recurrenceEnabled
    ? generateWeeklyRecurrenceDates(date, recurrenceDays, Number(recurrenceWeeks) || 1)
    : [];

  // Calcule automatiquement le prix prévu à partir du tarif horaire du client
  // et de la durée de la visite (tant que l'utilisateur ne l'a pas modifié à la main).
  useEffect(() => {
    if (priceEdited) return;
    if (!client.hourly_rate || !hours) return;
    setPrice((hours * Number(client.hourly_rate)).toFixed(2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, endTime]);

  function addTask() {
    if (!newTask.trim()) return;
    setTasks((t) => [...t, newTask.trim()]);
    setNewTask("");
  }

  function removeTask(i) {
    setTasks((t) => t.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!petId) {
      setError("Ajoute d'abord un animal à ce client.");
      return;
    }
    if (recurrenceEnabled && recurrenceDays.length === 0) {
      setError("Choisis au moins un jour pour la semaine type.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        petId,
        clientId: client.id,
        date,
        startTime: startTime || null,
        endTime: endTime || null,
        price: price ? Number(price) : 0,
        notes,
        tasks,
        recurrence:
          recurrenceEnabled && recurrenceDays.length > 0
            ? { weekdays: recurrenceDays, weeks: Number(recurrenceWeeks) || 1 }
            : null,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Erreur lors de la création.");
      return;
    }
    router.push(`/admin/clients/${client.id}`);
    router.refresh();
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href={`/admin/clients/${client.id}`} className="text-sm text-muted hover:underline">
          ← Retour à la fiche client
        </Link>
        <h1 className="font-display text-3xl font-semibold text-forest-dark mt-2">
          Planifier une visite
        </h1>
        <p className="text-muted text-sm mt-1">
          Pour {client.first_name} {client.last_name}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-5 space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1">Animal</label>
          {pets.length === 0 ? (
            <p className="text-sm text-danger">
              Aucun animal enregistré pour ce client — ajoute-en un depuis sa fiche avant de planifier.
            </p>
          ) : (
            <select className="input" value={petId} onChange={(e) => setPetId(e.target.value)}>
              {pets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="text-sm font-medium block mb-1.5">Date et horaires</label>
          <div className="ios-field-group">
            <div className="ios-field-row">
              <span className="ios-field-label">Début</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="pill-input pill-input--date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <input
                  type="time"
                  className="pill-input pill-input--time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            </div>
            <div className="ios-field-row">
              <span className="ios-field-label">Fin</span>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  className="pill-input pill-input--time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">
            Prix prévu (€) {hours ? <span className="text-muted font-normal">— {hours} h</span> : null}
          </label>
          <input
            type="number"
            step="0.01"
            className="input"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              setPriceEdited(true);
            }}
          />
          {client.hourly_rate > 0 && (
            <p className="text-xs text-muted mt-1">
              Calculé automatiquement depuis le tarif horaire ({client.hourly_rate} €/h) — modifiable.
            </p>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={recurrenceEnabled}
              onChange={(e) => toggleRecurrence(e.target.checked)}
            />
            <span className="text-sm font-medium">Répéter cette visite (semaine type)</span>
          </label>

          {recurrenceEnabled && (
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-sm font-medium mb-1.5">Jours de la semaine type</p>
                <div className="flex gap-1.5">
                  {WEEKDAYS_FR.map((d) => {
                    const active = recurrenceDays.includes(d.value);
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
                <span className="text-sm font-medium">Nombre de semaines</span>
                <div className="stepper">
                  <button
                    type="button"
                    onClick={() => setRecurrenceWeeks((w) => Math.max(1, Number(w) - 1))}
                    aria-label="Moins de semaines"
                  >
                    –
                  </button>
                  <span>{recurrenceWeeks}</span>
                  <button
                    type="button"
                    onClick={() => setRecurrenceWeeks((w) => Math.min(26, Number(w) + 1))}
                    aria-label="Plus de semaines"
                  >
                    +
                  </button>
                </div>
              </div>

              <p className="text-xs text-muted">
                {recurrenceDays.length === 0
                  ? "Choisis au moins un jour pour construire la semaine type."
                  : `${recurrenceDates.length} visite${
                      recurrenceDates.length > 1 ? "s" : ""
                    } seront planifiées, du ${formatDateFR(recurrenceDates[0])} au ${formatDateFR(
                      recurrenceDates[recurrenceDates.length - 1]
                    )}, avec les mêmes horaires et tâches.`}
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">Tâches de la visite</label>
          <div className="space-y-1.5 mb-2">
            {tasks.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm flex-1 bg-sand-dark/50 rounded px-2 py-1">{t}</span>
                <button type="button" onClick={() => removeTask(i)} className="text-xs text-danger">
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Ajouter une tâche..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTask();
                }
              }}
            />
            <button type="button" onClick={addTask} className="btn-ghost text-sm !px-3">
              Ajouter
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Notes / consignes particulières</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button disabled={loading || pets.length === 0} className="btn-primary">
          {loading
            ? "Création..."
            : recurrenceEnabled && recurrenceDates.length > 1
            ? `Planifier les ${recurrenceDates.length} visites`
            : "Planifier la visite"}
        </button>
      </form>
    </div>
  );
}
