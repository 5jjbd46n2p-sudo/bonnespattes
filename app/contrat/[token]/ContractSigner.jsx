"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CONTRACT_CHECKBOXES } from "@/lib/contractTemplate";
import { CheckCircle, EnvelopeSimple, PenNib } from "@phosphor-icons/react";

// Découpe le texte figé en blocs : titre principal, titres d'article ("## "), paragraphes.
function parseContent(content) {
  const blocks = [];
  const lines = String(content || "").split("\n");
  let first = true;
  let para = [];
  const flush = () => {
    if (para.length) blocks.push({ type: "p", text: para.join("\n") });
    para = [];
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) {
      flush();
      blocks.push({ type: "h2", text: line.slice(3) });
    } else if (line.trim() === "") {
      flush();
    } else if (first) {
      blocks.push({ type: "h1", text: line });
    } else {
      para.push(line);
    }
    first = false;
  }
  flush();
  return blocks;
}

export default function ContractSigner({ token, content, version, maskedEmail, expiresAt }) {
  const router = useRouter();
  const blocks = parseContent(content);

  const [name, setName] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [vetInfo, setVetInfo] = useState("");
  const [checks, setChecks] = useState({});
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const acceptOk = !!checks.accept;
  const formOk = name.trim().length >= 3 && emergencyContact.trim() && acceptOk;

  async function sendCode() {
    setError("");
    setInfo("");
    if (!formOk) {
      setError("Renseignez votre nom, la personne à prévenir en cas d'urgence et cochez l'acceptation du contrat.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/contract/${token}/otp`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Envoi du code impossible. Réessayez dans quelques instants.");
      } else {
        setCodeSent(true);
        setInfo(`Un code à 6 chiffres vient d'être envoyé à ${maskedEmail || "votre adresse email"}. Il est valable 10 minutes.`);
      }
    } catch {
      setError("Connexion impossible. Vérifiez votre réseau et réessayez.");
    }
    setSending(false);
  }

  async function sign(e) {
    e.preventDefault();
    setError("");
    if (!formOk) {
      setError("Renseignez votre nom, la personne à prévenir en cas d'urgence et cochez l'acceptation du contrat.");
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Saisissez le code à 6 chiffres reçu par email.");
      return;
    }
    setSigning(true);
    try {
      const res = await fetch(`/api/contract/${token}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim(),
          checkboxes: checks,
          emergencyContact: emergencyContact.trim(),
          vetInfo: vetInfo.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Signature impossible. Vérifiez le code et réessayez.");
        setSigning(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Connexion impossible. Vérifiez votre réseau et réessayez.");
      setSigning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-pierre">
          Bonjour, voici votre contrat (version {version}). Lisez-le, puis signez-le en bas de page.
          Ce lien est valable jusqu'au <span className="tabular-nums">{expiresAt}</span>. Aurore
        </p>
      </div>

      <article className="card p-5 md:p-8 space-y-4 text-[17px] leading-relaxed text-encre">
        {blocks.map((b, i) =>
          b.type === "h1" ? (
            <h1 key={i} className="font-display text-2xl md:text-3xl font-semibold">
              {b.text}
            </h1>
          ) : b.type === "h2" ? (
            <h2 key={i} className="font-display text-lg md:text-xl font-semibold pt-3">
              {b.text}
            </h2>
          ) : (
            <p key={i} className="whitespace-pre-line">
              {b.text}
            </p>
          )
        )}
      </article>

      <form onSubmit={sign} className="card p-5 md:p-8 space-y-5">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <PenNib size={24} aria-hidden="true" />
          Signer le contrat
        </h2>

        <div>
          <label htmlFor="emergency" className="label block mb-1">
            Personne à prévenir en cas d'urgence (nom et téléphone)
          </label>
          <input
            id="emergency"
            className="input"
            value={emergencyContact}
            onChange={(e) => setEmergencyContact(e.target.value)}
            autoComplete="off"
            required
          />
        </div>

        <div>
          <label htmlFor="vet" className="label block mb-1">
            Vétérinaire habituel (nom et téléphone, facultatif)
          </label>
          <input id="vet" className="input" value={vetInfo} onChange={(e) => setVetInfo(e.target.value)} autoComplete="off" />
        </div>

        <fieldset className="space-y-3">
          <legend className="label mb-1">Vos accords</legend>
          {CONTRACT_CHECKBOXES.map((c) => (
            <label key={c.id} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0 accent-rouille"
                checked={!!checks[c.id]}
                onChange={(e) => setChecks({ ...checks, [c.id]: e.target.checked })}
              />
              <span>
                {c.label}
                {c.required ? <span className="text-pierre"> (obligatoire)</span> : <span className="text-pierre"> (facultatif)</span>}
              </span>
            </label>
          ))}
        </fieldset>

        <div>
          <label htmlFor="signer" className="label block mb-1">
            Votre nom complet, en guise de signature
          </label>
          <input
            id="signer"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </div>

        <div className="border-t border-trait pt-5 space-y-4">
          <p className="text-pierre">
            Pour confirmer votre identité, un code à usage unique est envoyé à votre adresse email
            {maskedEmail ? ` (${maskedEmail})` : ""}.
          </p>
          <button type="button" onClick={sendCode} disabled={sending} className="btn-ghost gap-2 w-full sm:w-auto">
            <EnvelopeSimple size={20} aria-hidden="true" />
            {sending ? "Envoi..." : codeSent ? "Recevoir un nouveau code" : "Recevoir mon code"}
          </button>

          {codeSent && (
            <div>
              <label htmlFor="code" className="label block mb-1">
                Code à 6 chiffres
              </label>
              <input
                id="code"
                className="input tabular-nums tracking-widest text-xl max-w-[200px]"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
              />
            </div>
          )}
        </div>

        <div aria-live="polite" className="space-y-1">
          {info && (
            <p className="text-sm font-bold text-mousse flex items-start gap-1.5">
              <CheckCircle size={20} className="shrink-0" aria-hidden="true" />
              {info}
            </p>
          )}
          {error && <p className="text-sm font-bold text-brique">{error}</p>}
        </div>

        {codeSent && (
          <button disabled={signing} className="btn-primary w-full sm:w-auto gap-2">
            <PenNib size={20} aria-hidden="true" />
            {signing ? "Signature en cours..." : "Signer le contrat"}
          </button>
        )}
      </form>
    </div>
  );
}
