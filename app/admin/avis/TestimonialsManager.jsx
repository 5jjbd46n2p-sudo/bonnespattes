"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash, PencilSimple } from "@phosphor-icons/react";

function Row({ t, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [author, setAuthor] = useState(t.author);
  const [detail, setDetail] = useState(t.detail || "");
  const [body, setBody] = useState(t.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function call(method, payload) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/testimonials/${t.id}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Action impossible.");
      return false;
    }
    onChanged();
    return true;
  }

  async function save(e) {
    e.preventDefault();
    if (await call("PATCH", { author, detail, body })) setEditing(false);
  }

  async function remove() {
    if (confirm(`Supprimer l'avis de ${t.author} ?`)) await call("DELETE");
  }

  if (editing) {
    return (
      <form onSubmit={save} className="card p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Prénom</span>
            <input required maxLength={60} className="input mt-1" value={author} onChange={(e) => setAuthor(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Précision (facultatif)</span>
            <input maxLength={80} className="input mt-1" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Ex. Maman de Luna, chienne" />
          </label>
        </div>
        <label className="block">
          <span className="label">Avis</span>
          <textarea required rows={4} maxLength={600} className="input mt-1" value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        {error && <p role="alert" className="text-sm font-bold text-brique">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className="btn-primary text-sm">Enregistrer</button>
          <button type="button" onClick={() => setEditing(false)} className="btn-ghost text-sm">Annuler</button>
        </div>
      </form>
    );
  }

  return (
    <div className={`card p-4 ${t.published ? "" : "opacity-70"}`}>
      <p className="whitespace-pre-line">« {t.body} »</p>
      <p className="text-sm text-pierre mt-2">
        {t.author}
        {t.detail ? `, ${t.detail}` : ""}
      </p>
      {error && <p role="alert" className="text-sm font-bold text-brique mt-2">{error}</p>}
      <div className="flex items-center gap-3 mt-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={t.published} disabled={busy} onChange={(e) => call("PATCH", { published: e.target.checked })} />
          Affiché sur le site
        </label>
        <span className="flex-1" />
        <button type="button" onClick={() => setEditing(true)} aria-label={`Modifier l'avis de ${t.author}`} className="text-pierre p-1 rounded-lg hover:bg-sable">
          <PencilSimple size={20} aria-hidden="true" />
        </button>
        <button type="button" onClick={remove} disabled={busy} aria-label={`Supprimer l'avis de ${t.author}`} className="text-brique p-1 rounded-lg hover:bg-sable">
          <Trash size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default function TestimonialsManager({ initial }) {
  const router = useRouter();
  const [author, setAuthor] = useState("");
  const [detail, setDetail] = useState("");
  const [body, setBody] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/testimonials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author, detail, body, consent }),
    });
    if (res.ok) {
      setAuthor("");
      setDetail("");
      setBody("");
      setConsent(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Ajout impossible.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-5">
      <form onSubmit={add} className="card p-4 space-y-3">
        <h2 className="font-display text-xl font-semibold">Ajouter un avis</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Prénom</span>
            <input required maxLength={60} className="input mt-1" value={author} onChange={(e) => setAuthor(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Précision (facultatif)</span>
            <input maxLength={80} className="input mt-1" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Ex. Maman de Luna, chienne" />
          </label>
        </div>
        <label className="block">
          <span className="label">Avis (tel que la personne l'a écrit)</span>
          <textarea required rows={4} maxLength={600} className="input mt-1" value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>Cette personne m'a donné son accord pour publier cet avis avec son prénom.</span>
        </label>
        {error && <p role="alert" className="text-sm font-bold text-brique">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary text-sm">
          {busy ? "..." : "Ajouter"}
        </button>
      </form>

      {initial.length === 0 ? (
        <p className="text-pierre">Aucun avis pour l'instant. La section n'apparaît pas sur le site.</p>
      ) : (
        <div className="space-y-3">
          {initial.map((t) => (
            <Row key={`${t.id}-${t.published}-${t.body}`} t={t} onChanged={() => router.refresh()} />
          ))}
        </div>
      )}
    </div>
  );
}
