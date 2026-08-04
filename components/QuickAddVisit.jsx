"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function QuickAddVisit({ clients }) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");

  function go() {
    if (!clientId) return;
    router.push(`/admin/clients/${clientId}/visits/new`);
  }

  return (
    <div className="flex gap-2 w-full sm:w-auto">
      <select
        className="input min-w-0 flex-1 sm:flex-none sm:w-56"
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
      >
        <option value="">Choisir un client…</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.first_name} {c.last_name}
          </option>
        ))}
      </select>
      <button onClick={go} className="btn-accent shrink-0">
        + Planifier
      </button>
    </div>
  );
}
