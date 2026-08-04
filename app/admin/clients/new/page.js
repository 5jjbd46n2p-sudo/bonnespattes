"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewClientPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    hourlyRate: "",
  });
  const [pets, setPets] = useState([{ name: "", species: "", breed: "", notes: "" }]);
  const [createLogin, setCreateLogin] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState(generatePassword());
  const [sendEmail, setSendEmail] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function generatePassword() {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let pw = "";
    for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    return pw;
  }

  function updatePet(i, field, value) {
    setPets((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  }

  function addPet() {
    setPets((prev) => [...prev, { name: "", species: "", breed: "", notes: "" }]);
  }

  function removePet(i) {
    setPets((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (createLogin && !loginEmail) {
      setError("Renseigne un email pour l'accès client, ou décoche la création d'accès.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : 0,
        pets: pets.filter((p) => p.name.trim()),
        createLogin,
        loginEmail,
        loginPassword,
        sendEmail: createLogin && sendEmail,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erreur lors de la création.");
      setLoading(false);
      return;
    }
    if (data.emailWarning) {
      alert(
        `Le client a bien été créé, mais l'email des identifiants n'a pas pu être envoyé : ${data.emailWarning}`
      );
    }
    router.push(`/admin/clients/${data.client.id}`);
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin/clients" className="text-sm text-muted hover:underline">
          ← Retour aux clients
        </Link>
        <h1 className="font-display text-3xl font-semibold text-forest-dark mt-2">Nouveau client</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="card p-5 space-y-4">
          <h2 className="font-semibold text-forest-dark">Informations du client</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Prénom" required value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
            <Field label="Nom" required value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
            <Field label="Téléphone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          </div>
          <Field
            label="Adresse (pour l'itinéraire Waze)"
            value={form.address}
            onChange={(v) => setForm({ ...form, address: v })}
            placeholder="12 rue des Lilas, 75011 Paris"
          />
          <Field
            label="Tarif horaire indicatif (€)"
            type="number"
            value={form.hourlyRate}
            onChange={(v) => setForm({ ...form, hourlyRate: v })}
          />
          <div>
            <label className="text-sm font-medium block mb-1">Notes (consignes, clés, code…)</label>
            <textarea
              className="input"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </section>

        <section className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-forest-dark">Animaux</h2>
            <button type="button" onClick={addPet} className="btn-ghost text-sm !py-1 !px-3">
              + Ajouter un animal
            </button>
          </div>
          {pets.map((pet, i) => (
            <div key={i} className="border border-border rounded-lg p-4 space-y-3 relative">
              {pets.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePet(i)}
                  className="absolute top-2 right-2 text-xs text-danger hover:underline"
                >
                  Retirer
                </button>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Nom" value={pet.name} onChange={(v) => updatePet(i, "name", v)} />
                <Field label="Espèce" value={pet.species} onChange={(v) => updatePet(i, "species", v)} placeholder="Chien, chat…" />
                <Field label="Race" value={pet.breed} onChange={(v) => updatePet(i, "breed", v)} />
              </div>
              <Field label="Notes (santé, habitudes…)" value={pet.notes} onChange={(v) => updatePet(i, "notes", v)} />
            </div>
          ))}
        </section>

        <section className="card p-5 space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={createLogin}
              onChange={(e) => setCreateLogin(e.target.checked)}
            />
            <span className="font-semibold text-forest-dark">Créer un accès client (portail de suivi)</span>
          </label>
          {createLogin && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Email de connexion"
                type="email"
                value={loginEmail}
                onChange={setLoginEmail}
                placeholder="client@exemple.fr"
              />
              <div>
                <label className="text-sm font-medium block mb-1">Mot de passe</label>
                <div className="flex gap-2">
                  <input className="input" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                  <button
                    type="button"
                    onClick={() => setLoginPassword(generatePassword())}
                    className="btn-ghost !px-3 text-sm shrink-0"
                  >
                    🔄
                  </button>
                </div>
                <p className="text-xs text-muted mt-1">
                  Note ce mot de passe pour le transmettre au client, il ne sera plus affiché ensuite.
                </p>
              </div>
            </div>
          )}
          {createLogin && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
              <span className="text-sm">
                Envoyer automatiquement l'email + le lien d'accès au client à la création
              </span>
            </label>
          )}
        </section>

        {error && (
          <p className="text-sm text-danger bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Création..." : "Créer le client"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, placeholder }) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <input
        type={type}
        required={required}
        className="input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
