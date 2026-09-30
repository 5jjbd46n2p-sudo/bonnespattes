"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SocialRateForm({ initialRate }) {
  const router = useRouter();
  const [rate, setRate] = useState(String(initialRate));
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ socialRate: String(rate).replace(",", ".") }),
    });
    if (res.ok) {
      setMsg("Enregistré.");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setMsg(data.error || "Enregistrement impossible.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={save} className="flex items-end gap-2 flex-wrap">
      <label className="block">
        <span className="label">Taux de cotisations (%)</span>
        <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} className="input mt-1 w-28" />
      </label>
      <button type="submit" disabled={busy} className="btn-ghost text-sm">
        Enregistrer
      </button>
      {msg && (
        <span role="status" className="text-sm text-pierre">
          {msg}
        </span>
      )}
    </form>
  );
}
