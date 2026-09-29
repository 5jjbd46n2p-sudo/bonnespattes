"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Envelope, CurrencyEur, MapPin, Trash } from "@phosphor-icons/react";
import WazeLink from "@/components/WazeLink";

export default function ClientInfoCard({ client, invoiceCount = 0 }) {
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
  const [deleting, setDeleting] = useState(false);

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

  // Exercice du droit à l'effacement (RGPD) : supprime définitivement le
  // client et toutes ses données liées (animaux, visites, photos, accès
  // portail). Avertit explicitement si des factures existent, car elles sont
  // normalement soumises à une obligation légale de conservation comptable.
  async function removeClient() {
    const invoiceWarning =
      invoiceCount > 0
        ? `\n\nAttention : ce client a ${invoiceCount} facture${invoiceCount > 1 ? "s" : ""} enregistrée${
            invoiceCount > 1 ? "s" : ""
          }. La loi impose normalement de conserver les documents comptables plusieurs années : exporte-les (Comptabilité, puis Export CSV, ou le PDF de chaque facture) avant de continuer si tu dois les garder.`
        : "";
    const confirmed = confirm(
      `Supprimer définitivement ${client.first_name} ${client.last_name} et toutes ses données (animaux, historique de visites, photos, accès au portail) ? Cette action est irréversible.${invoiceWarning}`
    );
    if (!confirmed) return;
    setDeleting(true);
    const res = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      alert("La suppression a échoué. Réessaie plus tard.");
      return;
    }
    router.push("/admin/clients");
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold text-encre">
              {client.first_name} {client.last_name}
            </h2>
            <div className="mt-2 space-y-1.5 text-sm text-pierre">
              {client.phone && (
                <p className="flex items-center gap-2">
                  <Phone size={20} aria-hidden="true" />
                  <a href={`tel:${client.phone}`} className="hover:underline tabular-nums">
                    {client.phone}
                  </a>
                </p>
              )}
              {client.email && (
                <p className="flex items-center gap-2">
                  <Envelope size={20} aria-hidden="true" />
                  {client.email}
                </p>
              )}
              {client.hourly_rate > 0 && (
                <p className="flex items-center gap-2">
                  <CurrencyEur size={20} aria-hidden="true" />
                  <span className="tabular-nums">Tarif indicatif : {client.hourly_rate} €/h</span>
                </p>
              )}
            </div>
          </div>
          <button onClick={() => setEditing(true)} className="btn-ghost text-sm !py-1.5 !px-3 shrink-0">
            Modifier
          </button>
        </div>

        {client.address && (
          <div className="mt-4 pt-4 border-t border-trait">
            <p className="text-sm flex items-start gap-2">
              <MapPin size={20} className="shrink-0 text-pierre" aria-hidden="true" />
              {client.address}
            </p>
            <WazeLink address={client.address} className="mt-1.5" />
          </div>
        )}

        {client.notes && (
          <div className="mt-4 pt-4 border-t border-trait">
            <p className="label mb-1">Notes</p>
            <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-trait">
          <button
            onClick={removeClient}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 text-[13px] font-bold text-brique hover:underline"
          >
            {!deleting && <Trash size={20} aria-hidden="true" />}
            {deleting ? "Suppression..." : "Supprimer ce client et toutes ses données"}
          </button>
        </div>
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
        <label className="label block mb-1">Notes</label>
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
      <label className="label block mb-1">{label}</label>
      <input type={type} className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
