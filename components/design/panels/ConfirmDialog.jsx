"use client";

import { useEffect, useId, useRef } from "react";

// Boîte de confirmation maison (pas de confirm()). Échap ou clic hors de la
// fenêtre : annuler. Le focus va sur le bouton de confirmation.
export default function ConfirmDialog({ open, title, children, confirmLabel = "Confirmer", cancelLabel = "Annuler", busy = false, error = "", onConfirm, onCancel }) {
  const confirmRef = useRef(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    confirmRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) {
        e.stopPropagation();
        onCancel?.();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      if (previous && typeof previous.focus === "function") previous.focus();
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-encre/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="card w-full max-w-sm p-5"
        style={{ boxShadow: "var(--shadow-modal)" }}
      >
        <h2 id={titleId} className="font-display text-xl font-semibold text-encre">
          {title}
        </h2>
        <div id={bodyId} className="mt-2 text-pierre">
          {children}
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-brique">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button ref={confirmRef} type="button" className="btn-primary" onClick={onConfirm} disabled={busy}>
            {busy ? "Un instant…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
