"use client";

import { useEffect, useState } from "react";

// Nombre de demandes au statut NOUVEAU, pour le badge de navigation.
// Silencieux en cas d'erreur (API ou table pas encore disponibles).
export default function useNewLeadsCount(pathname) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    fetch("/api/leads?status=NOUVEAU")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        if (typeof d.newCount === "number") return setCount(d.newCount);
        const list = Array.isArray(d) ? d : d.leads || d.rows || [];
        setCount(Array.isArray(list) ? list.length : 0);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pathname]);
  return count;
}
