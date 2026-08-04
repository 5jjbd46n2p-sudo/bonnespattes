"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsForm({ settings }) {
  const router = useRouter();
  const [form, setForm] = useState({
    businessName: settings.business_name || "",
    businessAddress: settings.business_address || "",
    siret: settings.siret || "",
    tvaNumber: settings.tva_number || "",
    iban: settings.iban || "",
    defaultTvaRate: settings.default_tva_rate || 0,
    invoicePrefix: settings.invoice_prefix || "F",
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(e) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, defaultTvaRate: Number(form.defaultTvaRate) }),
    });
    setLoading(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={save} className="card p-5 space-y-4">
      <h2 className="font-semibold text-forest-dark">Informations affichées sur vos factures</h2>
      <Field label="Nom de l'activité" value={form.businessName} onChange={(v) => setForm({ ...form, businessName: v })} />
      <Field label="Adresse" value={form.businessAddress} onChange={(v) => setForm({ ...form, businessAddress: v })} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="SIRET" value={form.siret} onChange={(v) => setForm({ ...form, siret: v })} />
        <Field label="N° TVA intracommunautaire" value={form.tvaNumber} onChange={(v) => setForm({ ...form, tvaNumber: v })} />
      </div>
      <Field label="IBAN" value={form.iban} onChange={(v) => setForm({ ...form, iban: v })} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="Taux de TVA par défaut (%)"
          type="number"
          value={form.defaultTvaRate}
          onChange={(v) => setForm({ ...form, defaultTvaRate: v })}
        />
        <Field
          label="Préfixe des factures"
          value={form.invoicePrefix}
          onChange={(v) => setForm({ ...form, invoicePrefix: v })}
        />
      </div>
      <div className="flex items-center gap-3">
        <button disabled={loading} className="btn-primary text-sm">
          {loading ? "Enregistrement..." : "Enregistrer"}
        </button>
        {saved && <span className="text-sm text-forest">✓ Enregistré</span>}
      </div>
    </form>
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
