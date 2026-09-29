"use client";

import { useState } from "react";
import { CheckCircle } from "@phosphor-icons/react";
import { todayISO } from "@/lib/utils";

const SERVICES = [
  { value: "VISITE", label: "Visites à domicile" },
  { value: "PROMENADE", label: "Promenades" },
  { value: "LES_DEUX", label: "Les deux" },
];

const DAYS = [
  [1, "Lun"], [2, "Mar"], [3, "Mer"], [4, "Jeu"], [5, "Ven"], [6, "Sam"], [7, "Dim"],
];
const MINUTES = [30, 45, 60];

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
  const [mode, setMode] = useState("CONTACT"); // CONTACT | DEVIS
  const [q, setQ] = useState({
    type: "PONCTUELLE",
    startDate: "",
    endDate: "",
    weekdays: [],
    openEnded: false,
    weeks: "4",
    perDay: "1",
    minutes: "30",
    needs: "",
  });
  const [status, setStatus] = useState("idle"); // idle | sending | done
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setQuote = (k) => (e) => setQ((v) => ({ ...v, [k]: e.target.value }));
  const toggleDay = (d) =>
    setQ((v) => ({ ...v, weekdays: v.weekdays.includes(d) ? v.weekdays.filter((x) => x !== d) : [...v.weekdays, d] }));
  const today = todayISO();

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (mode === "DEVIS" && q.type === "REGULIERE" && q.weekdays.length === 0) {
      setError("Choisissez au moins un jour de la semaine.");
      return;
    }
    setStatus("sending");
    try {
      const payload =
        mode === "DEVIS"
          ? {
              ...form,
              service: "",
              message: "",
              kind: "DEVIS",
              quote: {
                type: q.type,
                startDate: q.startDate,
                perDay: Number(q.perDay),
                minutes: Number(q.minutes),
                needs: q.needs,
                ...(q.type === "PONCTUELLE"
                  ? { endDate: q.endDate }
                  : {
                      weekdays: q.weekdays,
                      openEnded: q.openEnded,
                      ...(q.openEnded ? {} : { weeks: Number(q.weeks) }),
                    }),
              },
            }
          : { ...form, kind: "CONTACT" };
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
          {mode === "DEVIS" ? "Je vous envoie un devis sous 48 h." : "Je vous réponds sous 24 h."} Un accusé de réception vient de partir dans votre boîte mail. Pensez à
          regarder dans les courriers indésirables si vous ne le voyez pas. — Aurore
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-lin border border-trait rounded-lg p-5 md:p-8 space-y-4" noValidate={false}>
      <div role="tablist" aria-label="Type de demande" className="grid grid-cols-2 gap-1 p-1 bg-sable rounded-lg">
        {[
          ["CONTACT", "Un premier contact"],
          ["DEVIS", "Devis garde longue ou régulière"],
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={mode === k}
            onClick={() => { setMode(k); setError(""); }}
            className={`min-h-[44px] px-2 rounded-md text-sm font-bold ${mode === k ? "bg-lin text-rouille border border-trait" : "text-pierre"}`}
          >
            {label}
          </button>
        ))}
      </div>

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

      {mode === "DEVIS" ? (
        <div className="space-y-4">
          <fieldset>
            <legend className="label mb-1">Type de garde</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[["PONCTUELLE", "Une période précise (vacances...)"], ["REGULIERE", "Des visites régulières"]].map(([v, l]) => (
                <label key={v} className={`flex items-center gap-2 min-h-[44px] px-3 rounded-lg border cursor-pointer ${q.type === v ? "border-rouille bg-sable" : "border-trait bg-lin"}`}>
                  <input type="radio" name="qtype" value={v} checked={q.type === v} onChange={setQuote("type")} className="accent-[var(--color-rouille)]" />
                  <span className="text-[15px]">{l}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Date de début" required>
              <input className="input" type="date" required min={today} value={q.startDate} onChange={setQuote("startDate")} />
            </Field>
            {q.type === "PONCTUELLE" ? (
              <Field label="Date de fin" required>
                <input className="input" type="date" required min={q.startDate || today} value={q.endDate} onChange={setQuote("endDate")} />
              </Field>
            ) : (
              <Field label="Pendant combien de semaines ?">
                <input className="input" type="number" min={1} max={52} disabled={q.openEnded} value={q.weeks} onChange={setQuote("weeks")} />
                <label className="flex items-center gap-2 mt-2 text-[15px]">
                  <input type="checkbox" checked={q.openEnded} onChange={(e) => setQ((v) => ({ ...v, openEnded: e.target.checked }))} className="accent-[var(--color-rouille)]" />
                  Sans date de fin
                </label>
              </Field>
            )}
          </div>

          {q.type === "REGULIERE" && (
            <fieldset>
              <legend className="label mb-1">Jours de la semaine</legend>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(([d, l]) => (
                  <label key={d} className={`flex items-center justify-center min-h-[44px] min-w-[52px] px-3 rounded-lg border cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-rouille ${q.weekdays.includes(d) ? "border-rouille bg-sable font-bold" : "border-trait bg-lin"}`}>
                    <input type="checkbox" className="sr-only" checked={q.weekdays.includes(d)} onChange={() => toggleDay(d)} />
                    <span className="text-[15px]">{l}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Passages par jour">
              <select className="input" value={q.perDay} onChange={setQuote("perDay")}>
                {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
            <Field label="Durée d'un passage">
              <select className="input" value={q.minutes} onChange={setQuote("minutes")}>
                {MINUTES.map((m) => <option key={m} value={m}>{m} minutes</option>)}
              </select>
            </Field>
          </div>

          <Field label="Besoins particuliers" hint="Médicaments, habitudes, caractère, accès au logement...">
            <textarea className="input" rows={4} maxLength={1500} value={q.needs} onChange={setQuote("needs")} />
          </Field>
          <p className="text-[13px] text-pierre">
            Je vous envoie un devis personnalisé sous 48 h. Le déplacement est calculé selon votre adresse.
          </p>
        </div>
      ) : (
      <>
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
      </>
      )}

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
          {status === "sending" ? "Envoi en cours..." : mode === "DEVIS" ? "Demander mon devis" : "Envoyer ma demande"}
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
