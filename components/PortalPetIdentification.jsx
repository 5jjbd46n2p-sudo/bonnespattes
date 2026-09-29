"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PortalPetIdentification({ pets }) {
  const router = useRouter();
  const [values, setValues] = useState(Object.fromEntries(pets.map((p) => [p.id, p.identification_number || ""])));
  const [state, setState] = useState({}); // id -> "saving" | "saved" | message d'erreur

  async function save(id) {
    setState((s) => ({ ...s, [id]: "saving" }));
    const res = await fetch(`/api/portal/pets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identificationNumber: values[id] }),
    });
    if (res.ok) {
      setState((s) => ({ ...s, [id]: "saved" }));
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setState((s) => ({ ...s, [id]: data.error || "Enregistrement impossible." }));
    }
  }

  return (
    <section className="card p-5 space-y-4" aria-labelledby="puce">
      <div>
        <h2 id="puce" className="font-display text-xl font-semibold">Puce ou tatouage</h2>
        <p className="text-sm text-pierre">
          Facultatif, mais conseillé : le numéro permet de retrouver votre animal en cas de perte.
        </p>
      </div>
      {pets.map((p) => (
        <div key={p.id} className="space-y-1">
          <label className="label block" htmlFor={`puce-${p.id}`}>{p.name}</label>
          <div className="flex gap-2 flex-wrap">
            <input
              id={`puce-${p.id}`}
              className="input flex-1 min-w-[12rem]"
              maxLength={30}
              value={values[p.id]}
              onChange={(e) => {
                setValues((v) => ({ ...v, [p.id]: e.target.value }));
                setState((s) => ({ ...s, [p.id]: undefined }));
              }}
              placeholder="Numéro de puce (15 chiffres) ou de tatouage"
            />
            <button type="button" onClick={() => save(p.id)} disabled={state[p.id] === "saving"} className="btn-primary text-sm">
              {state[p.id] === "saving" ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
          {state[p.id] === "saved" && <p role="status" className="text-sm font-bold text-mousse">Enregistré, merci.</p>}
          {state[p.id] && state[p.id] !== "saving" && state[p.id] !== "saved" && (
            <p role="alert" className="text-sm font-bold text-brique">{state[p.id]}</p>
          )}
        </div>
      ))}
    </section>
  );
}
