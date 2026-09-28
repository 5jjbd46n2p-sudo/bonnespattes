"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { computeVisitHours } from "@/lib/utils";

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
  const [recurrenceFrequency, setRecurrenceFrequency] = useState("daily");
  const [occurrences, setOccurrences] = useState(7);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const hours = computeVisitHours(startTime, endTime);

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
        recurrence: recurrenceEnabled
          ? { frequency: recurrenceFrequency, occurrences: Number(occurrences) || 1 }
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Début</label>
            <input type="time" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Fin</label>
            <input type="time" className="input" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
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
              onChange={(e) => setRecurrenceEnabled(e.target.checked)}
            />
            <span className="text-sm font-medium">Répéter cette visite (planification récurrente)</span>
          </label>
          {recurrenceEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <div>
                <label className="text-sm font-medium block mb-1">Fréquence</label>
                <select
                  className="input"
                  value={recurrenceFrequency}
                  onChange={(e) => setRecurrenceFrequency(e.target.value)}
                >
                  <option value="daily">Tous les jours</option>
                  <option value="weekly">Toutes les semaines</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Nombre de visites</label>
                <input
                  type="number"
                  min="2"
                  max="60"
                  className="input"
                  value={occurrences}
                  onChange={(e) => setOccurrences(e.target.value)}
                />
              </div>
            </div>
          )}
          <p className="text-xs text-muted mt-1.5">
            Ex. « Tous les jours » + 7 visites planifie automatiquement toute la semaine, avec les mêmes
            horaires et tâches.
          </p>
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
            : recurrenceEnabled && Number(occurrences) > 1
            ? `Planifier les ${occurrences} visites`
            : "Planifier la visite"}
        </button>
      </form>
    </div>
  );
}
