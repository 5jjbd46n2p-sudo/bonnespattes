"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, CopySimple, PencilSimple, Trash, X, PaintBrush } from "@phosphor-icons/react";
import { FORMATS, getFormat } from "@/lib/designFormats";
import { templatesFor } from "@/lib/designTemplates";

const ORIENTATIONS = [
  { key: "portrait", label: "Portrait" },
  { key: "paysage", label: "Paysage" },
];

// Orientation naturelle d'un format (carte : paysage, flyers : portrait).
function naturalOrientation(key) {
  return FORMATS[key]?.orientation || (key === "CARTE" ? "paysage" : "portrait");
}

function formatLabel(key) {
  return FORMATS[key]?.label || key;
}

function sizeHint(key) {
  const t = getFormat(key, naturalOrientation(key))?.trimMm;
  return t ? `${t.w} × ${t.h} mm` : "";
}

// `updated_at::text` de Postgres (« 2026-11-10 14:23:05.12+00 ») → « 10 nov. 2026 ».
// Fuseau fixe pour que le rendu serveur et le rendu navigateur soient identiques.
function formatDate(text) {
  if (!text) return "";
  const iso = String(text).replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" });
}

async function send(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => null);
  if (!res) return { ok: false, data: { error: "Connexion impossible. Vérifie ta connexion et réessaie." } };
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

// Boîte de dialogue native : focus piégé, Échap, retour du focus à la fermeture.
function Modal({ open, onClose, title, busy = false, children }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      const target = d.querySelector("[data-autofocus]");
      if (target) target.focus();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        if (busy) e.preventDefault();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onClose();
      }}
      className="m-auto w-[min(36rem,calc(100%-2rem))] max-h-[90dvh] rounded-lg border border-trait bg-lin text-encre p-0 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop:bg-black/50"
    >
      {open && (
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h2 id={titleId} className="font-display text-xl font-semibold text-encre pt-2">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label="Fermer"
              className="shrink-0 w-11 h-11 -mr-2 flex items-center justify-center rounded-lg text-pierre hover:bg-sable hover:text-encre"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

function ErrorText({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-sm font-bold text-brique">
      {children}
    </p>
  );
}

const optionClass =
  "flex items-start gap-3 min-h-[44px] px-3 py-2.5 rounded-lg border border-trait bg-lin cursor-pointer hover:bg-sable has-[:checked]:border-rouille has-[:checked]:bg-sable has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-rouille";

function NewDesignDialog({ open, onClose }) {
  const router = useRouter();
  const formats = Object.keys(FORMATS);
  const [format, setFormat] = useState(formats[0] || "CARTE");
  const [orientation, setOrientation] = useState(naturalOrientation(formats[0] || "CARTE"));
  const [choice, setChoice] = useState("blank");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isFlyer = format !== "CARTE";
  const effectiveOrientation = isFlyer ? orientation : naturalOrientation(format);
  const templates = (templatesFor(format) || []).filter(
    (t) => !t.orientation || t.orientation === effectiveOrientation
  );

  function pickFormat(key) {
    setFormat(key);
    setOrientation(naturalOrientation(key));
    setChoice("blank");
    setError("");
  }

  function pickOrientation(key) {
    setOrientation(key);
    setChoice("blank");
  }

  function close() {
    if (busy) return;
    setError("");
    onClose();
  }

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { ok, data } = await send("/api/designs", "POST", {
      name: name.trim() || undefined,
      format,
      orientation: effectiveOrientation,
      templateId: choice === "blank" ? null : choice,
    });
    const id = data?.design?.id;
    if (!ok || !id) {
      setBusy(false);
      setError(data?.error || "Création impossible, réessaie.");
      return;
    }
    // On garde l'état « en cours » jusqu'à l'ouverture de l'éditeur.
    router.push(`/admin/conception/${id}`);
  }

  return (
    <Modal open={open} onClose={close} title="Nouvelle conception" busy={busy}>
      <form onSubmit={create} className="space-y-5">
        <fieldset className="space-y-2">
          <legend className="label mb-2">Format</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {formats.map((key, i) => (
              <label key={key} className={optionClass}>
                <input
                  type="radio"
                  name="format"
                  value={key}
                  checked={format === key}
                  onChange={() => pickFormat(key)}
                  className="sr-only"
                  {...(i === 0 ? { "data-autofocus": "" } : {})}
                />
                <span>
                  <span className="block font-bold">{formatLabel(key)}</span>
                  {sizeHint(key) && <span className="block text-sm text-pierre num">{sizeHint(key)}</span>}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {isFlyer && (
          <fieldset className="space-y-2">
            <legend className="label mb-2">Orientation</legend>
            <div className="grid grid-cols-2 gap-2">
              {ORIENTATIONS.map((o) => (
                <label key={o.key} className={optionClass}>
                  <input
                    type="radio"
                    name="orientation"
                    value={o.key}
                    checked={orientation === o.key}
                    onChange={() => pickOrientation(o.key)}
                    className="sr-only"
                  />
                  <span className="font-bold">{o.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className="space-y-2">
          <legend className="label mb-2">Point de départ</legend>
          <div className="space-y-2 max-h-[40dvh] overflow-y-auto">
            <label className={optionClass}>
              <input
                type="radio"
                name="template"
                value="blank"
                checked={choice === "blank"}
                onChange={() => setChoice("blank")}
                className="sr-only"
              />
              <span>
                <span className="block font-bold">Page vierge</span>
                <span className="block text-sm text-pierre">Fond papier, rien d'autre.</span>
              </span>
            </label>
            {templates.map((t) => (
              <label key={t.id} className={optionClass}>
                <input
                  type="radio"
                  name="template"
                  value={t.id}
                  checked={choice === t.id}
                  onChange={() => setChoice(t.id)}
                  className="sr-only"
                />
                <span>
                  <span className="block font-bold">{t.label}</span>
                  {t.description && <span className="block text-sm text-pierre">{t.description}</span>}
                </span>
              </label>
            ))}
          </div>
          {templates.length === 0 && (
            <p className="text-sm text-pierre">Pas de modèle dans cette orientation : pars d'une page vierge.</p>
          )}
        </fieldset>

        <div>
          <label htmlFor="new-design-name" className="label block mb-1">
            Nom
          </label>
          <input
            id="new-design-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Sans titre"
            className="input"
          />
        </div>

        <ErrorText>{error}</ErrorText>

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={close} disabled={busy} className="btn-ghost text-sm">
            Annuler
          </button>
          <button type="submit" disabled={busy} className="btn-primary text-sm">
            {busy ? "Création..." : "Créer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function RenameDialog({ design, onClose }) {
  const router = useRouter();
  const [name, setName] = useState(design?.name || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Dialogue toujours monté (le focus revient au bouton à la fermeture) : on repart du nom actuel à chaque ouverture.
  useEffect(() => {
    if (design) {
      setName(design.name || "");
      setError("");
    }
  }, [design]);

  async function save(e) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return setError("Donne un nom à ta conception.");
    setBusy(true);
    setError("");
    const { ok, data } = await send(`/api/designs/${design.id}`, "PATCH", { name: clean });
    setBusy(false);
    if (!ok) return setError(data?.error || "Renommage impossible, réessaie.");
    onClose();
    router.refresh();
  }

  return (
    <Modal open={Boolean(design)} onClose={() => !busy && onClose()} title="Renommer" busy={busy}>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label htmlFor="rename-design-name" className="label block mb-1">
            Nom
          </label>
          <input
            id="rename-design-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
            className="input"
            data-autofocus=""
          />
        </div>
        <ErrorText>{error}</ErrorText>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="btn-ghost text-sm">
            Annuler
          </button>
          <button type="submit" disabled={busy} className="btn-primary text-sm">
            {busy ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteDialog({ design, onClose }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (design) setError("");
  }, [design]);

  async function remove() {
    setBusy(true);
    setError("");
    const { ok, data } = await send(`/api/designs/${design.id}`, "DELETE");
    setBusy(false);
    if (!ok) return setError(data?.error || "Suppression impossible, réessaie.");
    onClose();
    router.refresh();
  }

  return (
    <Modal open={Boolean(design)} onClose={() => !busy && onClose()} title="Supprimer cette conception ?" busy={busy}>
      <p>
        « {design?.name} » sera supprimée définitivement. Les PDF déjà téléchargés restent sur ton appareil.
      </p>
      <ErrorText>{error}</ErrorText>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onClose} disabled={busy} className="btn-ghost text-sm" data-autofocus="">
          Annuler
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="btn-ghost text-sm !border-brique !text-brique disabled:opacity-60"
        >
          <Trash size={20} aria-hidden="true" />
          {busy ? "Suppression..." : "Supprimer"}
        </button>
      </div>
    </Modal>
  );
}

function DesignCard({ design, busy, onDuplicate, onRename, onDelete }) {
  const href = `/admin/conception/${design.id}`;
  const label = formatLabel(design.format);
  const orientationNote =
    design.format !== "CARTE" && design.orientation && design.orientation !== naturalOrientation(design.format)
      ? ` · ${design.orientation}`
      : "";
  const date = formatDate(design.updated_at);

  return (
    <li className="card overflow-hidden flex flex-col">
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden="true"
        className="relative block aspect-[4/3] bg-sable border-b border-trait"
      >
        {design.thumbnail ? (
          <img src={design.thumbnail} alt="" className="absolute inset-0 w-full h-full object-contain p-3" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-pierre font-bold">{label}</span>
        )}
      </Link>
      <div className="p-3 flex-1 flex flex-col gap-3">
        <div className="min-w-0">
          <p className="font-bold truncate" title={design.name}>
            {design.name}
          </p>
          <p className="text-sm text-pierre">
            {label}
            {orientationNote}
            {date && (
              <>
                {" · "}modifié le <span className="num">{date}</span>
              </>
            )}
          </p>
        </div>
        <div className="mt-auto flex items-center gap-1">
          <Link href={href} className="btn-primary text-sm mr-auto" aria-label={`Ouvrir ${design.name}`}>
            Ouvrir
          </Link>
          <div className="hidden md:flex items-center gap-1">
            <button
              type="button"
              onClick={() => onDuplicate(design)}
              disabled={busy}
              aria-label={`Dupliquer ${design.name}`}
              title="Dupliquer"
              className="w-11 h-11 flex items-center justify-center rounded-lg text-pierre hover:bg-sable hover:text-encre disabled:opacity-60"
            >
              <CopySimple size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onRename(design)}
              disabled={busy}
              aria-label={`Renommer ${design.name}`}
              title="Renommer"
              className="w-11 h-11 flex items-center justify-center rounded-lg text-pierre hover:bg-sable hover:text-encre disabled:opacity-60"
            >
              <PencilSimple size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(design)}
              disabled={busy}
              aria-label={`Supprimer ${design.name}`}
              title="Supprimer"
              className="w-11 h-11 flex items-center justify-center rounded-lg text-pierre hover:bg-sable hover:text-brique disabled:opacity-60"
            >
              <Trash size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

export default function DesignsList({ designs = [] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [duplicating, setDuplicating] = useState("");
  const [error, setError] = useState("");

  async function duplicate(design) {
    setDuplicating(design.id);
    setError("");
    const { ok, data } = await send(`/api/designs/${design.id}/duplicate`, "POST");
    setDuplicating("");
    if (!ok) return setError(data?.error || "Duplication impossible, réessaie.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setCreating(true)} className="btn-primary text-sm hidden md:inline-flex">
          <Plus size={20} aria-hidden="true" />
          Nouvelle conception
        </button>
        <p className="md:hidden text-sm text-pierre">
          Création et modification sur ordinateur. Ici, tu peux ouvrir une conception pour la voir et la télécharger.
        </p>
      </div>

      <ErrorText>{error}</ErrorText>

      {designs.length === 0 ? (
        <div className="card p-6 flex flex-col items-center text-center gap-2 text-pierre">
          <PaintBrush size={32} aria-hidden="true" />
          <p>Pas encore de conception.</p>
          <p className="text-sm hidden md:block">Commence par une carte de visite ou un flyer, depuis un modèle ou une page vierge.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {designs.map((d) => (
            <DesignCard
              key={d.id}
              design={d}
              busy={duplicating === d.id}
              onDuplicate={duplicate}
              onRename={setRenaming}
              onDelete={setDeleting}
            />
          ))}
        </ul>
      )}

      <NewDesignDialog open={creating} onClose={() => setCreating(false)} />
      <RenameDialog design={renaming} onClose={() => setRenaming(null)} />
      <DeleteDialog design={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
