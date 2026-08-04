"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import WazeLink from "@/components/WazeLink";

export default function ClientInfoCard({ client }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: client.first_name,
    lastName: client.last_name,
    phone: client.phone || "",
    email: client.email || "",
    address: client.address || "",
    notes: client.notes || "",
    hourlyRate: client.hourly_rate || 0,
  });
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, hourlyRate: Number(form.hourlyRate) }),
    });
    setLoading(false);
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold text-forest-dark">
              {client.first_name} {client.last_name}
            </h2>
            <div className="mt-2 space-y-1 text-sm text-muted">
              {client.phone && <p>📞 {client.phone}</p>}
              {client.email && <p>✉️ {client.email}</p>}
              {client.hourly_rate > 0 && <p>💶 Tarif indicatif : {client.hourly_rate} €/h</p>}
            </div>
          </div>
          <button onClick={() => setEditing(true)} className="btn-ghost text-sm !py-1.5 !px-3 shrink-0">
            Modifier
          </button>
        </div>

        {client.address && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm">📍 {client.address}</p>
            <WazeLink address={client.address} className="mt-1.5" />
          </div>
        )}

        {client.notes && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card p-5 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Prénom" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
        <Field label="Nom" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
        <Field label="Téléphone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Field label="Tarif horaire (€)" type="number" value={form.hourlyRate} onChange={(v) => setForm({ ...form, hourlyRate: v })} />
      </div>
      <Field label="Adresse" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
      <div>
        <label className="text-sm font-medium block mb-1">Notes</label>
        <textarea
          className="input"
          rows={3}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={loading} className="btn-primary text-sm">
          {loading ? "Enregistrement..." : "Enregistrer"}
        </button>
        <button onClick={() => setEditing(false)} className="btn-ghost text-sm">
          Annuler
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1">{label}</label>
      <input type={type} className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
