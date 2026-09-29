"use client";

import { useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";

export default function CopyLink({ value }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers indisponible : on sélectionne le champ pour copie manuelle.
      document.getElementById("lien-parrainage")?.select();
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <input
        id="lien-parrainage"
        readOnly
        value={value}
        aria-label="Votre lien de parrainage"
        className="input flex-1 text-sm"
        onFocus={(e) => e.target.select()}
      />
      <button type="button" onClick={copy} className="btn-ghost gap-2 shrink-0">
        {copied ? <Check size={20} aria-hidden="true" /> : <Copy size={20} aria-hidden="true" />}
        <span aria-live="polite">{copied ? "Lien copié" : "Copier le lien"}</span>
      </button>
    </div>
  );
}
