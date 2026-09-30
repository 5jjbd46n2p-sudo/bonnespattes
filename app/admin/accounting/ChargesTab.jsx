import Link from "next/link";
import { query } from "@/lib/db";
import { formatEUR, todayISO } from "@/lib/utils";
import ExpensesManager from "./ExpensesManager";
import SocialRateForm from "./SocialRateForm";

function shiftMonth(mois, delta) {
  const [y, m] = mois.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export default async function ChargesTab({ mois }) {
  const current = todayISO().slice(0, 7);
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(mois || "") ? mois : current;
  const first = `${month}-01`;
  const next = `${shiftMonth(month, 1)}-01`;
  const label = new Date(`${first}T00:00:00Z`).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const [expRes, caRes, setRes] = await Promise.all([
    query("SELECT * FROM expenses WHERE date >= $1 AND date < $2 ORDER BY date DESC, created_at DESC", [first, next]),
    query(
      `SELECT COALESCE(SUM(total_ttc) FILTER (WHERE status = 'PAYEE'),0) AS paid,
              COALESCE(SUM(total_ttc),0) AS billed
       FROM invoices WHERE NOT is_test AND issue_date >= $1 AND issue_date < $2`,
      [first, next]
    ),
    query("SELECT social_rate FROM settings LIMIT 1"),
  ]);

  const expenses = expRes.rows;
  const rate = Number(setRes.rows[0]?.social_rate ?? 21.2);
  const paid = Number(caRes.rows[0].paid);
  const billed = Number(caRes.rows[0].billed);
  const charges = expenses.reduce((s, x) => s + Number(x.amount), 0);
  const cotisations = Math.round(paid * rate) / 100;
  const net = paid - cotisations - charges;

  const byCategory = new Map();
  for (const x of expenses) byCategory.set(x.category, (byCategory.get(x.category) || 0) + Number(x.amount));

  const stats = [
    { label: "Encaissé (factures payées)", value: formatEUR(paid), hint: `${formatEUR(billed)} facturés` },
    { label: `Cotisations estimées (${rate} %)`, value: `− ${formatEUR(cotisations)}`, hint: "À reverser à l'Urssaf" },
    { label: "Charges du mois", value: `− ${formatEUR(charges)}`, hint: `${expenses.length} dépense${expenses.length > 1 ? "s" : ""}` },
    { label: "Reste pour toi", value: formatEUR(net), hint: "Estimation avant impôt", strong: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Link href={`/admin/accounting?tab=charges&mois=${shiftMonth(month, -1)}`} className="btn-ghost text-sm" aria-label="Mois précédent">
          ←
        </Link>
        <h2 className="font-display text-xl font-semibold capitalize min-w-40 text-center">{label}</h2>
        <Link href={`/admin/accounting?tab=charges&mois=${shiftMonth(month, 1)}`} className="btn-ghost text-sm" aria-label="Mois suivant">
          →
        </Link>
        {month !== current && (
          <Link href="/admin/accounting?tab=charges" className="text-sm text-rouille underline ml-2">
            Mois en cours
          </Link>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={`card p-4 ${s.strong ? "border-rouille" : ""}`}>
            <p className="text-sm text-pierre">{s.label}</p>
            <p className="font-display text-2xl font-semibold tabular-nums mt-1">{s.value}</p>
            <p className="text-sm text-pierre mt-1">{s.hint}</p>
          </div>
        ))}
      </div>

      {byCategory.size > 0 && (
        <p className="text-sm text-pierre tabular-nums flex flex-wrap gap-x-3 gap-y-1">
          {[...byCategory.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([c, v]) => (
              <span key={c}>
                {c} : {formatEUR(v)}
              </span>
            ))}
        </p>
      )}

      <ExpensesManager expenses={expenses} defaultDate={month === current ? todayISO() : first} />

      <div className="card p-4 space-y-3">
        <SocialRateForm initialRate={rate} />
        <p className="text-sm text-pierre">
          En micro-entreprise, les cotisations se calculent sur le chiffre d'affaires encaissé, et les charges ne les
          réduisent pas : elles servent à connaître ton vrai reste. Le taux est une estimation, à vérifier sur
          autoentrepreneur.urssaf.fr (il peut être réduit la première année avec l'ACRE).
        </p>
      </div>
    </div>
  );
}
