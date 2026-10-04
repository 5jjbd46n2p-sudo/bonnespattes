"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, X, MagnifyingGlass, MapPin, CaretRight, NavigationArrow } from "@phosphor-icons/react";
import { basePrice, travelFee as computeTravelFee } from "@/lib/pricing";
import {
  computeVisitHours,
  generateWeeklyRecurrenceDates,
  isoWeekday,
  WEEKDAYS_FR,
  formatDateFR,
  todayISO,
} from "@/lib/utils";

// Montant sans décimales inutiles : « 22 € », « 9,50 € ».
function eur(n) {
  const v = Number(n) || 0;
  return Number.isInteger(v)
    ? `${v} €`
    : `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

// Durée en minutes entre deux heures "HH:MM" (null si impossible).
function minutesBetween(start, end) {
  if (!start || !end) return null;
  const toMin = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const d = toMin(end) - toMin(start);
  return d > 0 ? d : null;
}

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
export default function NewVisitForm({ client: fixedClient = null, clients = [], pets = [], initialDate, settings = {} }) {
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
  const [manualPrice, setManualPrice] = useState(null); // null = prestation conseillée
  const [manualTravel, setManualTravel] = useState(null); // null = déplacement conseillé
  const [calc, setCalc] = useState(null); // distance calculée dans cette session {clientId, km, min}
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState("");
  const [notes, setNotes] = useState("");
  const [firstVisit, setFirstVisit] = useState(false);
  const [discountPercent, setDiscountPercent] = useState("20");
  const [tasks, setTasks] = useState([...DEFAULT_TASKS]);
  const [newTask, setNewTask] = useState("");
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceDays, setRecurrenceDays] = useState([]);
  const [recurrenceWeeks, setRecurrenceWeeks] = useState(4);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const hours = computeVisitHours(startTime, endTime);
  // Tarif conseillé = prestation (selon la durée, 1 h tant que les horaires ne
  // sont pas saisis) + déplacement (selon la distance du client).
  const minutes = minutesBetween(startTime, endTime) || 60;
  const dist =
    calc && calc.clientId === selectedClient?.id
      ? { km: calc.km, min: calc.min }
      : { km: selectedClient?.distance_km, min: selectedClient?.travel_minutes };
  const distanceKnown = dist.km !== null && dist.km !== undefined && dist.km !== "";
  const suggestedBase = Number(basePrice(minutes, settings, selectedClient?.hourly_rate)) || 0;
  const suggestedTravel = distanceKnown
    ? Number(computeTravelFee({ distanceKm: Number(dist.km), travelMinutes: Number(dist.min) || 0 }, settings)) || 0
    : 0;
  const suggestedTotal = suggestedBase + suggestedTravel;
  const price = manualPrice !== null ? manualPrice : suggestedBase.toFixed(2);
  const travelFee = manualTravel !== null ? manualTravel : suggestedTravel.toFixed(2);
  const isApplied = manualPrice === null && manualTravel === null;
  // Remise « première visite » : sur la prestation de la première visite (le déplacement reste dû).
  const discountValue = firstVisit ? Math.min(100, Math.max(0, Number(String(discountPercent).replace(",", ".")) || 0)) : 0;
  const priceNum = Number(price) || 0;
  const discountedPrice = Math.round(priceNum * (1 - discountValue / 100) * 100) / 100;
  const discountAmount = Math.round((priceNum - discountedPrice) * 100) / 100;

  async function calculateDistance() {
    if (!selectedClient) return;
    setCalcLoading(true);
    setCalcError("");
    try {
      const res = await fetch(`/api/clients/${selectedClient.id}/travel`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Impossible de calculer la distance.");
      setCalc({ clientId: selectedClient.id, km: data.distanceKm, min: data.travelMinutes });
      setManualTravel(null);
    } catch (e) {
      setCalcError(e.message || "Impossible de calculer la distance.");
    } finally {
      setCalcLoading(false);
    }
  }

  const locked = !selectedClient;

  function selectClient(id) {
    setClientId(id);
    const first = pets.find((p) => p.client_id === id);
    setPetId(first?.id || "");
    setManualPrice(null);
    setManualTravel(null);
    setCalcError("");
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
        discountPercent: discountValue,
        travelFee: travelFee ? Number(travelFee) : 0,
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
          <Link href={`/admin/planning?date=${date}`} className="text-sm text-pierre hover:underline inline-flex items-center gap-1.5">
            <ArrowLeft size={20} aria-hidden="true" />
            Retour au planning
          </Link>
        ) : (
          <Link href={`/admin/clients/${fixedClient.id}`} className="text-sm text-pierre hover:underline inline-flex items-center gap-1.5">
            <ArrowLeft size={20} aria-hidden="true" />
            Retour à la fiche client
          </Link>
        )}
        <h1 className="font-display font-semibold text-encre mt-2">Planifier une visite</h1>
        {!pickMode && (
          <p className="text-pierre text-sm mt-1">
            Pour {fixedClient.first_name} {fixedClient.last_name}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="card p-5 space-y-4">
        {pickMode && (
          <div>
            <label className="label block mb-1.5">Client</label>
            {selectedClient ? (
              <div className="ios-field-group">
                <div className="ios-field-row">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-8 h-8 rounded-full bg-sable text-encre text-[13px] font-bold flex items-center justify-center shrink-0">
                      {(selectedClient.first_name?.[0] || "") + (selectedClient.last_name?.[0] || "")}
                    </span>
                    <span className="font-semibold truncate">
                      {selectedClient.first_name} {selectedClient.last_name}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => selectClient("")}
                    className="text-sm text-rouille font-bold shrink-0"
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
            <label className="label block mb-1">Animal</label>
            {selectedClient && clientPets.length === 0 ? (
              <p className="text-sm text-brique">
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
            <label className="label block mb-1.5">Date et horaires</label>
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

          <div className="space-y-3">
            <div className="ios-field-group">
              <div className="ios-field-row">
                <span className="min-w-0">
                  <span className="label block">Tarif conseillé</span>
                  <span className="text-[13px] text-pierre tabular-nums block">
                    Prestation {eur(suggestedBase)}
                    {Number(selectedClient?.hourly_rate) > 0 ? ` (tarif client ${Number(selectedClient.hourly_rate)} €/h, grille proportionnelle)` : ""}
                    {distanceKnown ? ` + Déplacement ${eur(suggestedTravel)}` : ""}
                    {hours ? ` (${hours} h)` : ""}
                  </span>
                </span>
                <span className="flex items-center gap-3 shrink-0">
                  <span className="font-bold tabular-nums">{eur(suggestedTotal)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setManualPrice(null);
                      setManualTravel(null);
                    }}
                    disabled={isApplied}
                    className="btn-ghost !py-1 !px-3 text-sm"
                  >
                    {isApplied ? "Appliqué" : "Appliquer"}
                  </button>
                </span>
              </div>
            </div>

            {!distanceKnown && selectedClient && (
              <p className="text-[13px] text-pierre flex items-center gap-2 flex-wrap">
                <span>Distance du client inconnue : déplacement non compté.</span>
                <button
                  type="button"
                  onClick={calculateDistance}
                  disabled={calcLoading}
                  className="inline-flex items-center gap-1.5 font-bold text-rouille hover:text-rouille-fonce underline underline-offset-4"
                >
                  <NavigationArrow size={20} aria-hidden="true" />
                  {calcLoading ? "Calcul…" : "Calculer la distance"}
                </button>
              </p>
            )}
            {distanceKnown && (
              <p className="text-[13px] text-pierre tabular-nums">
                Trajet : {Number(dist.km)} km{dist.min ? `, ${dist.min} min` : ""} (aller simple).
              </p>
            )}
            {calcError && <p className="text-sm text-brique">{calcError}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label block mb-1">Prestation (€)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={price}
                  onChange={(e) => setManualPrice(e.target.value)}
                />
              </div>
              <div>
                <label className="label block mb-1">Déplacement (€)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={travelFee}
                  onChange={(e) => setManualTravel(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-trait pt-4 space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={firstVisit} onChange={(e) => setFirstVisit(e.target.checked)} />
              <span className="text-sm font-bold">Première visite : remise</span>
            </label>
            {firstVisit && (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  inputMode="decimal"
                  aria-label="Remise en pourcentage"
                  className="input !w-24"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                />
                <span className="text-sm">%</span>
                <span className="text-[13px] text-pierre tabular-nums">
                  {discountValue > 0
                    ? `Prestation ${eur(priceNum)} → ${eur(discountedPrice)} (− ${eur(discountAmount)})${
                        recurrenceEnabled ? ", sur la première visite seulement" : ""
                      }. Le déplacement reste dû.`
                    : "Indique un pourcentage (20 % ou plus)."}
                </span>
              </div>
            )}
          </div>

          <div className="border-t border-trait pt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={recurrenceEnabled}
                onChange={(e) => toggleRecurrence(e.target.checked)}
              />
              <span className="text-sm font-bold">Répéter cette visite (semaine type)</span>
            </label>

            {recurrenceEnabled && (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-sm font-bold mb-1.5">Jours de la semaine type</p>
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
                  <span className="text-sm font-bold">Nombre de semaines</span>
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

                <p className="text-[13px] text-pierre">
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
            <label className="label block mb-2">Tâches de la visite</label>
            <div className="space-y-1.5 mb-2">
              {tasks.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm flex-1 bg-sable rounded-lg px-3 py-1.5">{t}</span>
                  <button
                    type="button"
                    onClick={() => removeTask(i)}
                    className="text-brique p-1 rounded-lg hover:bg-sable"
                    aria-label={`Retirer la tâche « ${t} »`}
                  >
                    <X size={20} aria-hidden="true" />
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
            <label className="label block mb-1">Notes / consignes particulières</label>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </fieldset>

        {locked && (
          <p className="text-sm text-pierre text-center">Choisis d'abord un client pour continuer.</p>
        )}

        {error && <p className="text-sm text-brique">{error}</p>}

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
      <p className="text-sm text-pierre">
        Aucun client pour l'instant.{" "}
        <Link href="/admin/clients/new" className="text-rouille underline">
          Crée ton premier client
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="ios-field-group">
      <div className="p-2 border-b border-trait relative">
        <MagnifyingGlass
          size={20}
          className="absolute left-5 top-1/2 -translate-y-1/2 text-pierre pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          className="input !min-h-[40px] !pl-10"
          placeholder="Rechercher un client…"
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
      <ul className="max-h-64 overflow-y-auto divide-y divide-trait">
        {filtered.length === 0 ? (
          <li className="px-4 py-3 text-sm text-pierre">Aucun client ne correspond.</li>
        ) : (
          filtered.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-sable active:bg-sable"
              >
                <span className="min-w-0">
                  <span className="font-bold block truncate">
                    {c.first_name} {c.last_name}
                  </span>
                  {c.address && (
                    <span className="text-[13px] text-pierre flex items-center gap-1 min-w-0">
                      <MapPin size={20} className="shrink-0" aria-hidden="true" />
                      <span className="truncate">{c.address}</span>
                    </span>
                  )}
                </span>
                <CaretRight size={20} className="text-pierre shrink-0" aria-hidden="true" />
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
