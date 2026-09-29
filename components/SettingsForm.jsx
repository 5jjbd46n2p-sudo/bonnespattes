"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "@phosphor-icons/react";
import { DEFAULT_CONTRACT_TEMPLATE } from "@/lib/contractTemplate";

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
    legalForm: settings.legal_form || "",
    contactEmail: settings.contact_email || "",
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
      <h2 className="font-display font-semibold text-encre">Informations affichées sur vos factures</h2>
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
        {saved && (
          <span className="text-sm font-bold text-mousse inline-flex items-center gap-1.5">
            <Check size={20} aria-hidden="true" />
            Enregistré
          </span>
        )}
      </div>
    </form>
  );
}

export function LegalSettingsForm({ settings }) {
  const router = useRouter();
  const [form, setForm] = useState({
    legalForm: settings.legal_form || "",
    contactEmail: settings.contact_email || "",
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(e) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={save} className="card p-5 space-y-4">
      <div>
        <h2 className="font-display font-semibold text-encre">Mentions légales &amp; RGPD</h2>
        <p className="text-[13px] text-pierre mt-1">
          Utilisées pour générer automatiquement les pages publiques{" "}
          <span className="whitespace-nowrap">« Mentions légales »</span> et{" "}
          <span className="whitespace-nowrap">« Politique de confidentialité »</span> du site (avec le nom,
          l'adresse et le SIRET renseignés ci-dessus).
        </p>
      </div>
      <Field
        label="Statut juridique"
        value={form.legalForm}
        onChange={(v) => setForm({ ...form, legalForm: v })}
        placeholder="Ex. Auto-entrepreneur / Entreprise individuelle"
      />
      <Field
        label="Email de contact pour les demandes RGPD"
        type="email"
        value={form.contactEmail}
        onChange={(v) => setForm({ ...form, contactEmail: v })}
        placeholder="contact@tondomaine.fr"
      />
      <div className="flex items-center gap-3">
        <button disabled={loading} className="btn-primary text-sm">
          {loading ? "Enregistrement..." : "Enregistrer"}
        </button>
        {saved && (
          <span className="text-sm font-bold text-mousse inline-flex items-center gap-1.5">
            <Check size={20} aria-hidden="true" />
            Enregistré
          </span>
        )}
      </div>
    </form>
  );
}

export function PricingSettingsForm({ settings }) {
  const router = useRouter();
  const [form, setForm] = useState({
    rate30: settings.rate_30 ?? 15,
    rate45: settings.rate_45 ?? 18,
    rate60: settings.rate_60 ?? 22,
    kmRate: settings.km_rate ?? 0.5,
    travelFreeKm: settings.travel_free_km ?? 4,
    travelTimeSharePct: Math.round(Number(settings.travel_time_share ?? 0.5) * 100),
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rate30: Number(form.rate30),
        rate45: Number(form.rate45),
        rate60: Number(form.rate60),
        kmRate: Number(form.kmRate),
        travelFreeKm: Number(form.travelFreeKm),
        travelTimeShare: Number(form.travelTimeSharePct) / 100,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Enregistrement impossible.");
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={save} className="card p-5 space-y-4">
      <div>
        <h2 className="font-display font-semibold text-encre">Tarifs &amp; déplacement</h2>
        <p className="text-[13px] text-pierre mt-1">
          Le barème kilométrique fiscal (voiture 5 CV) est d'environ 0,64 €/km ; le carburant seul coûte environ
          0,12 €/km. La valeur par défaut est de 0,50 €/km. Ces tarifs servent de suggestion : tu peux toujours
          modifier le prix de chaque visite.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Visite de 30 min (€)" type="number" step="0.5" min="0" value={form.rate30} onChange={(v) => setForm({ ...form, rate30: v })} />
        <Field label="Visite de 45 min (€)" type="number" step="0.5" min="0" value={form.rate45} onChange={(v) => setForm({ ...form, rate45: v })} />
        <Field label="Visite de 1 h (€)" type="number" step="0.5" min="0" value={form.rate60} onChange={(v) => setForm({ ...form, rate60: v })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Indemnité kilométrique (€/km)" type="number" step="0.01" min="0" value={form.kmRate} onChange={(v) => setForm({ ...form, kmRate: v })} />
        <Field label="Franchise de déplacement (km aller-retour)" type="number" step="0.5" min="0" value={form.travelFreeKm} onChange={(v) => setForm({ ...form, travelFreeKm: v })} />
        <Field label="Temps de trajet facturé (% du tarif horaire)" type="number" step="5" min="0" max="100" value={form.travelTimeSharePct} onChange={(v) => setForm({ ...form, travelTimeSharePct: v })} />
      </div>
      <p className="text-[13px] text-pierre">
        En dessous de la franchise, aucun frais de déplacement n'est ajouté. Au-delà, on facture les kilomètres
        aller-retour plus le temps de trajet à la part du tarif horaire (1 h) indiquée.
      </p>
      {error && <p className="text-sm font-bold text-rouille">{error}</p>}
      <div className="flex items-center gap-3">
        <button disabled={loading} className="btn-primary text-sm">
          {loading ? "Enregistrement..." : "Enregistrer"}
        </button>
        {saved && (
          <span className="text-sm font-bold text-mousse inline-flex items-center gap-1.5">
            <Check size={20} aria-hidden="true" />
            Enregistré
          </span>
        )}
      </div>
    </form>
  );
}

export function PublicSettingsForm({ settings }) {
  const router = useRouter();
  const [form, setForm] = useState({
    referralCredit: settings.referral_credit ?? 10,
    serviceArea: settings.service_area || "Viarmes et environs (15 km)",
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referralCredit: Number(form.referralCredit), serviceArea: form.serviceArea }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Enregistrement impossible.");
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={save} className="card p-5 space-y-4">
      <div>
        <h2 className="font-display font-semibold text-encre">Site public &amp; parrainage</h2>
        <p className="text-[13px] text-pierre mt-1">
          Le crédit est offert au parrain et au filleul, et déduit de leur prochaine facture. La zone s'affiche
          sur la page d'accueil.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Crédit de parrainage (€)" type="number" step="0.5" min="0" value={form.referralCredit} onChange={(v) => setForm({ ...form, referralCredit: v })} />
        <Field label="Zone d'intervention" value={form.serviceArea} onChange={(v) => setForm({ ...form, serviceArea: v })} />
      </div>
      {error && <p className="text-sm font-bold text-rouille">{error}</p>}
      <div className="flex items-center gap-3">
        <button disabled={loading} className="btn-primary text-sm">
          {loading ? "Enregistrement..." : "Enregistrer"}
        </button>
        {saved && (
          <span className="text-sm font-bold text-mousse inline-flex items-center gap-1.5">
            <Check size={20} aria-hidden="true" />
            Enregistré
          </span>
        )}
      </div>
    </form>
  );
}

export function ContractSettingsForm({ settings }) {
  const router = useRouter();
  const [form, setForm] = useState({
    insuranceInfo: settings.insurance_info || "",
    mediatorInfo: settings.mediator_info || "",
    contractTemplate: settings.contract_template || DEFAULT_CONTRACT_TEMPLATE,
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const version = settings.contract_version ?? 1;

  async function save(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        insuranceInfo: form.insuranceInfo,
        mediatorInfo: form.mediatorInfo,
        // null = modèle par défaut
        contractTemplate: form.contractTemplate.trim() === DEFAULT_CONTRACT_TEMPLATE.trim() ? null : form.contractTemplate,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Enregistrement impossible.");
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  function reset() {
    if (!confirm("Rétablir le modèle par défaut ? Ton texte actuel sera remplacé (après enregistrement).")) return;
    setForm({ ...form, contractTemplate: DEFAULT_CONTRACT_TEMPLATE });
  }

  return (
    <form onSubmit={save} className="card p-5 space-y-4">
      <div>
        <h2 className="font-display font-semibold text-encre">Contrat</h2>
        <p className="text-[13px] text-pierre mt-1">
          Version courante du modèle : <span className="tabular-nums">{version}</span>. Un contrat déjà envoyé ou signé
          n'est jamais modifié : la version augmente à chaque changement du modèle.
        </p>
      </div>
      <Field
        label="Assurance RC pro (compagnie et n° de contrat)"
        value={form.insuranceInfo}
        onChange={(v) => setForm({ ...form, insuranceInfo: v })}
      />
      <Field
        label="Médiateur de la consommation (nom, adresse, site)"
        value={form.mediatorInfo}
        onChange={(v) => setForm({ ...form, mediatorInfo: v })}
      />
      <div>
        <label className="label block mb-1">Modèle de contrat</label>
        <textarea
          className="input font-mono text-[13px] leading-relaxed"
          rows={18}
          value={form.contractTemplate}
          onChange={(e) => setForm({ ...form, contractTemplate: e.target.value })}
        />
        <p className="text-[13px] text-pierre mt-1">
          Une ligne commençant par « ## » est un titre d'article. Variables disponibles : {"{{business_name}}"},{" "}
          {"{{legal_form}}"}, {"{{siret}}"}, {"{{business_address}}"}, {"{{contact_email}}"}, {"{{client_name}}"},{" "}
          {"{{client_address}}"}, {"{{client_email}}"}, {"{{client_phone}}"}, {"{{insurance_info}}"},{" "}
          {"{{mediator_info}}"}, {"{{animals}}"}, {"{{tva_mention}}"}.
        </p>
        <p className="text-[13px] text-pierre mt-1">
          Le modèle par défaut est indicatif : fais-le relire par un professionnel (assureur, CCI, juriste) avant de
          l'utiliser.
        </p>
      </div>
      {error && <p className="text-sm font-bold text-brique">{error}</p>}
      <div className="flex items-center gap-3 flex-wrap">
        <button disabled={loading} className="btn-primary text-sm">
          {loading ? "Enregistrement..." : "Enregistrer"}
        </button>
        <button type="button" onClick={reset} className="btn-ghost text-sm">
          Rétablir le modèle par défaut
        </button>
        {saved && (
          <span className="text-sm font-bold text-mousse inline-flex items-center gap-1.5">
            <Check size={20} aria-hidden="true" />
            Enregistré
          </span>
        )}
      </div>
    </form>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, ...rest }) {
  return (
    <div>
      <label className="label block mb-1">{label}</label>
      <input
        type={type}
        className="input"
        value={value}
        placeholder={placeholder}
        {...rest}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
