"use client";

import { useState } from "react";
import { CheckCircle } from "@phosphor-icons/react";

const SERVICES = [
  { value: "VISITE", label: "Visites à domicile" },
  { value: "PROMENADE", label: "Promenades" },
  { value: "LES_DEUX", label: "Les deux" },
];

export default function LeadForm({ initialCode = "", referrerName = "" }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    commune: "",
    animals: "",
    service: "VISITE",
    message: "",
    referralCode: initialCode,
    website: "", // champ piège : doit rester vide
  });
  const [status, setStatus] = useState("idle"); // idle | sending | done
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    setStatus("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok !== false) {
        setStatus("done");
        return;
      }
      setError(
        res.status === 429
          ? "Vous avez déjà envoyé plusieurs demandes récemment. Merci de réessayer un peu plus tard."
          : data.error || "L'envoi n'a pas fonctionné. Vérifiez les champs ou réessayez dans un instant."
      );
    } catch {
      setError("Connexion impossible pour le moment. Réessayez dans un instant.");
    }
    setStatus("idle");
  }

  if (status === "done") {
    return (
      <div className="bg-lin border border-trait rounded-lg p-6 md:p-8" role="status">
        <CheckCircle size={32} className="text-mousse mb-3" aria-hidden="true" />
        <h3 className="font-display text-xl font-semibold">Merci, votre demande est bien arrivée.</h3>
        <p className="mt-2 text-pierre leading-relaxed">
          Je vous réponds sous 24 h. Un accusé de réception vient de partir dans votre boîte mail. Pensez à
          regarder dans les courriers indésirables si vous ne le voyez pas. — Aurore
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-lin border border-trait rounded-lg p-5 md:p-8 space-y-4" noValidate={false}>
      {referrerName && (
        <p className="text-sm font-bold text-mousse">Recommandé par {referrerName}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Votre nom" required>
          <input className="input" name="name" autoComplete="name" required minLength={2} value={form.name} onChange={set("name")} />
        </Field>
        <Field label="Votre email" required>
          <input className="input" type="email" name="email" autoComplete="email" required value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Téléphone (facultatif)">
          <input className="input" type="tel" name="phone" autoComplete="tel" value={form.phone} onChange={set("phone")} />
        </Field>
        <Field label="Commune">
          <input className="input" name="commune" autoComplete="address-level2" value={form.commune} onChange={set("commune")} />
        </Field>
      </div>

      <Field label="Vos animaux" hint="Chien ou chat, combien, quel âge : quelques mots suffisent.">
        <input className="input" name="animals" value={form.animals} onChange={set("animals")} placeholder="Ex. une chienne de 6 ans et un chat de 3 ans" />
      </Field>

      <fieldset>
        <legend className="label mb-1">Ce dont vous avez besoin</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SERVICES.map((s) => (
            <label
              key={s.value}
              className={`flex items-center gap-2 min-h-[44px] px-3 rounded-lg border cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-rouille ${
                form.service === s.value ? "border-rouille bg-sable" : "border-trait bg-lin"
              }`}
            >
              <input
                type="radio"
                name="service"
                value={s.value}
                checked={form.service === s.value}
                onChange={set("service")}
                className="accent-[var(--color-rouille)]"
              />
              <span className="text-[15px]">{s.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Votre message" hint="Dates, habitudes de votre compagnon, questions : dites-moi tout.">
        <textarea className="input" name="message" rows={4} maxLength={2000} value={form.message} onChange={set("message")} />
      </Field>

      <Field label="Code de parrainage (facultatif)">
        <input className="input sm:max-w-[14rem] uppercase" name="referralCode" autoComplete="off" maxLength={12} value={form.referralCode} onChange={set("referralCode")} />
      </Field>

      {/* Champ piège : invisible pour les personnes, rempli par les robots */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label>
          Ne pas remplir
          <input tabIndex={-1} autoComplete="off" name="website" value={form.website} onChange={set("website")} />
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm font-bold text-brique">
          {error}
        </p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <button type="submit" disabled={status === "sending"} className="btn-primary">
          {status === "sending" ? "Envoi en cours..." : "Envoyer ma demande"}
        </button>
        <p className="text-[13px] text-pierre">
          Vos informations ne servent qu'à vous répondre.{" "}
          <a href="/confidentialite" className="underline">
            Confidentialité
          </a>
        </p>
      </div>
    </form>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <label className="block">
      <span className="label block mb-1">
        {label}
        {required && <span className="text-rouille"> *</span>}
      </span>
      {children}
      {hint && <span className="block text-[13px] text-pierre mt-1">{hint}</span>}
    </label>
  );
}
