"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PetManager({ clientId, pets }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", species: "", breed: "", notes: "" });
  const [loading, setLoading] = useState(false);

  async function addPet(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    await fetch(`/api/clients/${clientId}/pets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    setForm({ name: "", species: "", breed: "", notes: "" });
    setAdding(false);
    router.refresh();
  }

  async function removePet(petId) {
    if (!confirm("Supprimer cet animal et tout son historique de visites ?")) return;
    await fetch(`/api/pets/${petId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-forest-dark">Animaux</h2>
        <button onClick={() => setAdding((a) => !a)} className="btn-ghost text-sm !py-1 !px-3">
          {adding ? "Annuler" : "+ Ajouter"}
        </button>
      </div>

      {adding && (
        <form onSubmit={addPet} className="border border-border rounded-lg p-4 space-y-3 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              className="input"
              placeholder="Nom *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="input"
              placeholder="Espèce (chien, chat…)"
              value={form.species}
              onChange={(e) => setForm({ ...form, species: e.target.value })}
            />
            <input
              className="input"
              placeholder="Race"
              value={form.breed}
              onChange={(e) => setForm({ ...form, breed: e.target.value })}
            />
          </div>
          <textarea
            className="input"
            placeholder="Notes (santé, habitudes, allergies…)"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <button disabled={loading} className="btn-primary text-sm">
            {loading ? "Ajout..." : "Ajouter l'animal"}
          </button>
        </form>
      )}

      {pets.length === 0 ? (
        <p className="text-sm text-muted">Aucun animal enregistré.</p>
      ) : (
        <div className="space-y-2">
          {pets.map((p) => (
            <div key={p.id} className="flex items-start justify-between border border-border rounded-lg p-3">
              <div>
                <p className="font-medium">
                  {p.name}{" "}
                  <span className="text-muted text-sm font-normal">
                    {[p.species, p.breed].filter(Boolean).join(" · ")}
                  </span>
                </p>
                {p.notes && <p className="text-sm text-muted mt-0.5">{p.notes}</p>}
              </div>
              <button onClick={() => removePet(p.id)} className="text-xs text-danger hover:underline shrink-0 ml-3">
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
