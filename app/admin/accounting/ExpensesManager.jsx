"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash } from "@phosphor-icons/react";
import { EXPENSE_CATEGORIES } from "@/lib/expenses";
import { formatDateFR, formatEUR } from "@/lib/utils";

export default function ExpensesManager({ expenses, defaultDate }) {
  const router = useRouter();
  const [date, setDate] = useState(defaultDate);
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, label, category, amount: String(amount).replace(",", ".") }),
    });
    if (res.ok) {
      setLabel("");
      setAmount("");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Ajout impossible.");
    }
    setBusy(false);
  }

  async function remove(exp) {
    if (!confirm(`Supprimer la charge « ${exp.label} » (${formatEUR(exp.amount)}) ?`)) return;
    setBusy(true);
    const res = await fetch(`/api/expenses/${exp.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else setError("Suppression impossible.");
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="card p-4 grid gap-3 md:grid-cols-[9rem_1fr_13rem_7rem_auto] items-end">
        <label className="block">
          <span className="label">Date</span>
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="input mt-1" />
        </label>
        <label className="block">
          <span className="label">Libellé</span>
          <input
            required
            maxLength={120}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex. plein d'essence"
            className="input mt-1"
          />
        </label>
        <label className="block">
          <span className="label">Catégorie</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input mt-1">
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Montant (€)</span>
          <input
            required
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className="input mt-1"
          />
        </label>
        <button type="submit" disabled={busy} className="btn-primary text-sm">
          Ajouter
        </button>
        {error && (
          <p role="alert" className="text-sm font-bold text-brique md:col-span-5">
            {error}
          </p>
        )}
      </form>

      {expenses.length === 0 ? (
        <div className="card p-8 text-center text-pierre">Aucune charge enregistrée ce mois-ci.</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="scroll-x">
            <table className="w-full text-sm min-w-[520px] tabular-nums">
              <thead className="text-pierre text-[13px] font-bold">
                <tr>
                  <th className="text-left font-bold px-4 py-3">Date</th>
                  <th className="text-left font-bold px-4 py-3">Libellé</th>
                  <th className="text-left font-bold px-4 py-3">Catégorie</th>
                  <th className="text-right font-bold px-4 py-3">Montant</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Supprimer</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((x) => (
                  <tr key={x.id} className="border-t border-trait">
                    <td className="px-4 py-3">{formatDateFR(x.date)}</td>
                    <td className="px-4 py-3">{x.label}</td>
                    <td className="px-4 py-3 text-pierre">{x.category}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatEUR(x.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => remove(x)}
                        disabled={busy}
                        aria-label={`Supprimer ${x.label}`}
                        className="text-brique p-1"
                      >
                        <Trash size={20} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
