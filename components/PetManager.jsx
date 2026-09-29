"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "@phosphor-icons/react";

const EMPTY = {
  name: "",
  species: "",
  breed: "",
  ageInfo: "",
  sterilized: false,
  identified: false,
  identificationNumber: "",
  diet: "",
  healthConditions: "",
  notes: "",
};

const fromPet = (p) => ({
  name: p.name || "",
  species: p.species || "",
  breed: p.breed || "",
  ageInfo: p.age_info || "",
  sterilized: !!p.sterilized,
  identified: !!p.identified,
  identificationNumber: p.identification_number || "",
  diet: p.diet || "",
  healthConditions: p.health_conditions || "",
  notes: p.notes || "",
});

function PetFields({ value, onChange }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  const check = (k) => (e) => onChange({ ...value, [k]: e.target.checked });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input className="input" aria-label="Nom" placeholder="Nom *" value={value.name} onChange={set("name")} />
        <input className="input" aria-label="Espèce" placeholder="Espèce (chien, chat…)" value={value.species} onChange={set("species")} />
        <input className="input" aria-label="Race" placeholder="Race" value={value.breed} onChange={set("breed")} />
      </div>
      <label className="block">
        <span className="label block mb-1">Âge / date de naissance</span>
        <input className="input" value={value.ageInfo} onChange={set("ageInfo")} placeholder="Ex. 6 ans, ou née le 12/03/2019" />
      </label>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <label className="flex items-center gap-2 min-h-[44px]">
          <input type="checkbox" className="w-5 h-5" checked={value.sterilized} onChange={check("sterilized")} />
          Stérilisé(e)
        </label>
        <label className="flex items-center gap-2 min-h-[44px]">
          <input type="checkbox" className="w-5 h-5" checked={value.identified} onChange={check("identified")} />
          Identifié(e) (puce ou tatouage)
        </label>
      </div>
      <label className="block">
        <span className="label block mb-1">Numéro de puce ou de tatouage</span>
        <input
          className="input"
          value={value.identificationNumber}
          maxLength={30}
          inputMode="text"
          onChange={(e) => onChange({ ...value, identificationNumber: e.target.value, identified: value.identified || e.target.value.trim() !== "" })}
          placeholder="Ex. 250268500123456"
        />
        <span className="block text-[13px] text-pierre mt-1">
          Facultatif, mais conseillé : il permet de retrouver l'animal en cas de perte.
        </span>
      </label>
      <label className="block">
        <span className="label block mb-1">Régime, rythme et quantité alimentaire</span>
        <textarea className="input" rows={2} value={value.diet} onChange={set("diet")} placeholder="Ex. croquettes, 2 repas par jour, 80 g le matin et le soir" />
      </label>
      <label className="block">
        <span className="label block mb-1">Pathologie / maladie</span>
        <textarea className="input" rows={2} value={value.healthConditions} onChange={set("healthConditions")} placeholder="Ex. diabète, traitement le matin ; allergies…" />
      </label>
      <label className="block">
        <span className="label block mb-1">Autres notes</span>
        <textarea className="input" rows={2} value={value.notes} onChange={set("notes")} placeholder="Habitudes, caractère…" />
      </label>
    </div>
  );
}

function Detail({ label, children }) {
  if (!children) return null;
  return (
    <p className="text-sm text-pierre mt-0.5 whitespace-pre-line">
      <span className="font-bold">{label} : </span>
      {children}
    </p>
  );
}

export default function PetManager({ clientId, pets }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  async function addPet(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setAddError("Le nom est requis.");
      return;
    }
    setLoading(true);
    setAddError("");
    const res = await fetch(`/api/clients/${clientId}/pets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setAddError(data.error || "Ajout impossible.");
      return;
    }
    setForm(EMPTY);
    setAdding(false);
    router.refresh();
  }

  function startEdit(p) {
    setEditId(p.id);
    setEditError("");
    setEdit(fromPet(p));
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!edit.name.trim()) {
      setEditError("Le nom est requis.");
      return;
    }
    setSaving(true);
    setEditError("");
    const res = await fetch(`/api/pets/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edit),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setEditError(data.error || "Enregistrement impossible.");
      return;
    }
    setEditId(null);
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
        <h2 className="font-display font-semibold text-encre">Animaux</h2>
        <button onClick={() => setAdding((a) => !a)} className="btn-ghost text-sm !py-1 !px-3">
          {!adding && <Plus size={20} aria-hidden="true" />}
          {adding ? "Annuler" : "Ajouter"}
        </button>
      </div>

      {adding && (
        <form onSubmit={addPet} className="border border-trait rounded-lg p-4 space-y-3 mb-4">
          <PetFields value={form} onChange={setForm} />
          {addError && <p role="alert" className="text-sm font-bold text-brique">{addError}</p>}
          <button disabled={loading} className="btn-primary text-sm">
            {loading ? "Ajout..." : "Ajouter l'animal"}
          </button>
        </form>
      )}

      {pets.length === 0 ? (
        <p className="text-sm text-pierre">Aucun animal enregistré.</p>
      ) : (
        <div className="list-group">
          {pets.map((p) =>
            editId === p.id ? (
              <form key={p.id} onSubmit={saveEdit} className="p-4 space-y-3 bg-sable rounded-lg my-2">
                <PetFields value={edit} onChange={setEdit} />
                {editError && <p role="alert" className="text-sm font-bold text-brique">{editError}</p>}
                <div className="flex gap-2">
                  <button disabled={saving} className="btn-primary text-sm">{saving ? "Enregistrement..." : "Enregistrer"}</button>
                  <button type="button" onClick={() => setEditId(null)} className="btn-ghost text-sm">Annuler</button>
                </div>
              </form>
            ) : (
              <div key={p.id} className="list-row justify-between">
                <div>
                  <p className="font-bold">
                    {p.name}{" "}
                    <span className="text-pierre text-sm font-normal">
                      {[p.species, p.breed].filter(Boolean).join(" · ")}
                    </span>
                  </p>
                  {(p.sterilized || p.identified) && (
                    <p className="text-sm text-pierre mt-0.5">
                      {[p.sterilized && "Stérilisé(e)", p.identified && "Identifié(e)"].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <Detail label="N° de puce / tatouage">{p.identification_number}</Detail>
                  <Detail label="Âge / naissance">{p.age_info}</Detail>
                  <Detail label="Alimentation">{p.diet}</Detail>
                  <Detail label="Pathologie">{p.health_conditions}</Detail>
                  <Detail label="Notes">{p.notes}</Detail>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <button onClick={() => startEdit(p)} className="text-[13px] font-bold text-rouille hover:underline min-h-[44px]">
                    Modifier
                  </button>
                  <button onClick={() => removePet(p.id)} className="text-[13px] font-bold text-brique hover:underline min-h-[44px]">
                    Supprimer
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
