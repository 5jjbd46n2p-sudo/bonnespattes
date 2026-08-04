import Link from "next/link";
import { query } from "@/lib/db";
import { formatDateFR, formatEUR } from "@/lib/utils";
import { InvoiceStatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function AccountingPage({ searchParams }) {
  const sp = await searchParams;
  const status = sp.status || "";

  const conditions = [];
  const values = [];
  let i = 1;
  if (status) {
    conditions.push(`i.status = $${i++}`);
    values.push(status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const invoicesRes = await query(
    `SELECT i.*, c.first_name, c.last_name,
      (SELECT COALESCE(SUM(amount),0) FROM payments pay WHERE pay.invoice_id = i.id) AS paid_amount
     FROM invoices i JOIN clients c ON c.id = i.client_id
     ${where}
     ORDER BY i.issue_date DESC, i.created_at DESC`,
    values
  );

  const summaryRes = await query(`
    SELECT
      COALESCE(SUM(total_ttc),0) AS total_ttc,
      COALESCE(SUM(total_ttc) FILTER (WHERE status = 'PAYEE'),0) AS total_paid,
      COALESCE(SUM(total_ttc) FILTER (WHERE status != 'PAYEE'),0) AS total_unpaid
    FROM invoices
  `);
  const summary = summaryRes.rows[0];

  const unbilledRes = await query(
    `SELECT COUNT(*) AS count, COALESCE(SUM(price),0) AS total FROM visits WHERE invoice_id IS NULL AND status = 'FAIT'`
  );

  const filters = [
    { value: "", label: "Toutes" },
    { value: "BROUILLON", label: "Brouillons" },
    { value: "ENVOYEE", label: "Envoyées" },
    { value: "PAYEE", label: "Payées" },
    { value: "EN_RETARD", label: "En retard" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-3xl font-semibold text-forest-dark">Comptabilité</h1>
        <div className="flex gap-2">
          <a href="/api/invoices/export" className="btn-ghost text-sm">
            ⬇ Export comptable (CSV)
          </a>
          <Link href="/admin/accounting/invoices/new" className="btn-accent text-sm">
            + Nouvelle facture
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs font-semibold text-muted uppercase">Total facturé</p>
          <p className="font-display text-2xl font-semibold text-forest-dark mt-1">{formatEUR(summary.total_ttc)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-muted uppercase">Encaissé</p>
          <p className="font-display text-2xl font-semibold text-forest-dark mt-1">{formatEUR(summary.total_paid)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-muted uppercase">En attente</p>
          <p className="font-display text-2xl font-semibold text-ochre-dark mt-1">{formatEUR(summary.total_unpaid)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-muted uppercase">Visites à facturer</p>
          <p className="font-display text-2xl font-semibold text-forest-dark mt-1">{unbilledRes.rows[0].count}</p>
          <p className="text-xs text-muted">{formatEUR(unbilledRes.rows[0].total)}</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/admin/accounting?status=${f.value}` : "/admin/accounting"}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
              status === f.value ? "bg-forest text-white border-forest" : "border-border text-muted hover:bg-sand-dark/50"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {invoicesRes.rows.length === 0 ? (
        <div className="card p-10 text-center text-muted">Aucune facture pour l'instant.</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="scroll-x">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-sand-dark/50 text-muted text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Numéro</th>
                  <th className="text-left px-4 py-3">Client</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-right px-4 py-3">Montant</th>
                  <th className="text-right px-4 py-3">Payé</th>
                  <th className="text-left px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {invoicesRes.rows.map((inv) => (
                  <tr key={inv.id} className="border-t border-border hover:bg-sand-dark/30">
                    <td className="px-4 py-3">
                      <Link href={`/admin/accounting/invoices/${inv.id}`} className="font-medium hover:underline">
                        {inv.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {inv.first_name} {inv.last_name}
                    </td>
                    <td className="px-4 py-3">{formatDateFR(inv.issue_date)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatEUR(inv.total_ttc)}</td>
                    <td className="px-4 py-3 text-right text-muted">{formatEUR(inv.paid_amount)}</td>
                    <td className="px-4 py-3">
                      <InvoiceStatusBadge status={inv.status} />
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
