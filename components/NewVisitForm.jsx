"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  computeVisitHours,
  generateWeeklyRecurrenceDates,
  isoWeekday,
  WEEKDAYS_FR,
  formatDateFR,
  todayISO,
} from "@/lib/utils";

const DEFAULT_TASKS = ["Nourrir", "Promenade", "Eau fraîche", "Litière / propreté", "Câlins & jeu"];

// Minuscule + sans accents, pour une recherche tolérante ("helene" trouve "Hélène").
function normalize(s) {
  return (s || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Formulaire de planification d'une visite.
 *
 * Deux modes :
 * - `client` fourni (depuis une fiche client) : le client est déjà connu.
 * - `clients` fourni sans `client` (bouton "+ Planifier" du planning / de la
 *   barre d'onglets) : on demande d'abord le client, et tout le reste du
 *   formulaire reste bloqué tant qu'aucun client n'est sélectionné.
 */
export default function NewVisitForm({ client: fixedClient = null, clients = [], pets = [], initialDate }) {
  const router = useRouter();
  const pickMode = !fixedClient;

  const [clientId, setClientId] = useState(fixedClient?.id || "");
  const selectedClient = fixedClient || clients.find((c) => c.id === clientId) || null;
  const clientPets = useMemo(
    () => (fixedClient ? pets : pets.filter((p) => p.client_id === clientId)),
    [fixedClient, pets, clientId]
  );

  const [petId, setPetId] = useState(fixedClient ? pets[0]?.id || "" : "");
  const [date, setDate] = useState(initialDate || todayISO());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [manualPrice, setManualPrice] = useState(null); // null = prix calculé automatiquement
  const [notes, setNotes] = useState("");
  const [tasks, setTasks] = useState([...DEFAULT_TASKS]);
  const [newTask, setNewTask] = useState("");
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceDays, setRecurrenceDays] = useState([]);
  const [recurrenceWeeks, setRecurrenceWeeks] = useState(4);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const hours = computeVisitHours(startTime, endTime);
  const hourlyRate = Number(selectedClient?.hourly_rate) || 0;
  // Prix calculé depuis le tarif horaire du client et la durée (1 h par défaut
  // tant que les horaires ne sont pas saisis), sauf s'il a été modifié à la main.
  const autoPrice = hourlyRate ? (hourlyRate * (hours || 1)).toFixed(2) : "";
  const price = manualPrice !== null ? manualPrice : autoPrice;

  const locked = !selectedClient;

  function selectClient(id) {
    setClientId(id);
    const first = pets.find((p) => p.client_id === id);
    setPetId(first?.id || "");
    setManualPrice(null);
    setError("");
  }

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
    if (!selectedClient) {
      setError("Choisis d'abord un client.");
      return;
    }
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
        clientId: selectedClient.id,
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
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Erreur lors de la création.");
      return;
    }
    router.push(pickMode ? `/admin/planning?date=${date}` : `/admin/clients/${selectedClient.id}`);
    router.refresh();
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        {pickMode ? (
          <Link href={`/admin/planning?date=${date}`} className="text-sm text-muted hover:underline">
            ← Retour au planning
          </Link>
        ) : (
          <Link href={`/admin/clients/${fixedClient.id}`} className="text-sm text-muted hover:underline">
            ← Retour à la fiche client
          </Link>
        )}
        <h1 className="font-display text-3xl font-semibold text-forest-dark mt-2">Planifier une visite</h1>
        {!pickMode && (
          <p className="text-muted text-sm mt-1">
            Pour {fixedClient.first_name} {fixedClient.last_name}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="card p-5 space-y-4">
        {pickMode && (
          <div>
            <label className="text-sm font-medium block mb-1.5">Client</label>
            {selectedClient ? (
              <div className="ios-field-group">
                <div className="ios-field-row">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-8 h-8 rounded-full bg-forest text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {(selectedClient.first_name?.[0] || "") + (selectedClient.last_name?.[0] || "")}
                    </span>
                    <span className="font-semibold truncate">
                      {selectedClient.first_name} {selectedClient.last_name}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => selectClient("")}
                    className="text-sm text-forest font-medium shrink-0"
                  >
                    Changer
                  </button>
                </div>
              </div>
            ) : (
              <ClientPicker clients={clients} onSelect={selectClient} />
            )}
          </div>
        )}

        {/* Tout le reste du formulaire est bloqué (champs désactivés) tant
            qu'aucun client n'est sélectionné. */}
        <fieldset
          disabled={locked}
          aria-disabled={locked}
          className={`min-w-0 space-y-4 transition-opacity ${locked ? "opacity-40 pointer-events-none select-none" : ""}`}
        >
          <div>
            <label className="text-sm font-medium block mb-1">Animal</label>
            {selectedClient && clientPets.length === 0 ? (
              <p className="text-sm text-danger">
                Aucun animal enregistré pour ce client —{" "}
                <Link href={`/admin/clients/${selectedClient.id}`} className="underline">
                  ajoute-en un depuis sa fiche
                </Link>{" "}
                avant de planifier.
              </p>
            ) : (
              <select className="input" value={petId} onChange={(e) => setPetId(e.target.value)}>
                {clientPets.length === 0 && <option value="">—</option>}
                {clientPets.map((p) => (
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
                    required
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
              onChange={(e) => setManualPrice(e.target.value)}
            />
            {hourlyRate > 0 && (
              <p className="text-xs text-muted mt-1">
                Calculé automatiquement depuis le tarif horaire ({hourlyRate} €/h) — modifiable.
                {manualPrice !== null && (
                  <>
                    {" "}
                    <button type="button" className="underline" onClick={() => setManualPrice(null)}>
                      Recalculer
                    </button>
                  </>
                )}
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
                  {recurrenceDays.length === 0 || recurrenceDates.length === 0
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
        </fieldset>

        {locked && (
          <p className="text-sm text-muted text-center">👆 Choisis d'abord un client pour continuer.</p>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <button disabled={loading || locked || clientPets.length === 0} className="btn-primary w-full sm:w-auto">
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

// Liste de clients avec recherche, façon liste de contacts iOS.
function ClientPicker({ clients, onSelect }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    const nq = normalize(q.trim());
    if (!nq) return clients;
    return clients.filter((c) =>
      normalize(`${c.first_name} ${c.last_name} ${c.last_name} ${c.first_name} ${c.address || ""}`).includes(nq)
    );
  }, [q, clients]);

  if (clients.length === 0) {
    return (
      <p className="text-sm text-muted">
        Aucun client pour l'instant.{" "}
        <Link href="/admin/clients/new" className="text-forest underline">
          Crée ton premier client
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="ios-field-group">
      <div className="p-2 border-b border-border">
        <input
          ref={inputRef}
          className="input !min-h-[40px]"
          placeholder="🔍 Rechercher un client…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (filtered.length === 1) onSelect(filtered[0].id);
            }
          }}
        />
      </div>
      <ul className="max-h-64 overflow-y-auto divide-y divide-border">
        {filtered.length === 0 ? (
          <li className="px-4 py-3 text-sm text-muted">Aucun client ne correspond.</li>
        ) : (
          filtered.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-sand-dark/50 active:bg-sand-dark"
              >
                <span className="min-w-0">
                  <span className="font-medium block truncate">
                    {c.first_name} {c.last_name}
                  </span>
                  {c.address && <span className="text-xs text-muted block truncate">📍 {c.address}</span>}
                </span>
                <span className="text-muted">›</span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
