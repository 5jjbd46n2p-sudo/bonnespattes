"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InvoiceStatusControl({ invoiceId, status }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function change(newStatus) {
    setLoading(true);
    await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <select
      className="input !w-auto text-sm"
      value={status}
      disabled={loading}
      onChange={(e) => change(e.target.value)}
    >
      <option value="BROUILLON">Brouillon</option>
      <option value="ENVOYEE">Envoyée</option>
      <option value="PAYEE">Payée</option>
      <option value="EN_RETARD">En retard</option>
    </select>
  );
}
