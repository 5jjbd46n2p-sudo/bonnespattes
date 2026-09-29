import Link from "next/link";
import { query } from "@/lib/db";
import { formatDateFR, formatEUR } from "@/lib/utils";
import { InvoiceStatusBadge } from "@/components/StatusBadge";
import { DownloadSimple, Plus } from "@phosphor-icons/react/ssr";

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
        <h1 className="font-display text-3xl font-semibold text-encre">Comptabilité</h1>
        <div className="flex gap-2 flex-wrap">
          {/* Téléchargement d'un fichier (route API) : un <a> classique, pas un <Link> */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/api/invoices/export" className="btn-ghost text-sm gap-2">
            <DownloadSimple size={20} aria-hidden="true" />
            Export comptable (CSV)
          </a>
          <Link href="/admin/accounting/invoices/new" className="btn-primary text-sm gap-2">
            <Plus size={20} aria-hidden="true" />
            Nouvelle facture
          </Link>
        </div>
      </div>

      {/* Une seule ligne de chiffres, discrète */}
      <p className="text-sm text-pierre tabular-nums flex flex-wrap gap-x-2 gap-y-1">
        <span>{formatEUR(summary.total_ttc)} facturés</span>
        <span aria-hidden="true">·</span>
        <span>{formatEUR(summary.total_paid)} encaissés</span>
        <span aria-hidden="true">·</span>
        <span>{formatEUR(summary.total_unpaid)} en attente</span>
        <span aria-hidden="true">·</span>
        <span>
          {unbilledRes.rows[0].count} visite{Number(unbilledRes.rows[0].count) > 1 ? "s" : ""} à facturer (
          {formatEUR(unbilledRes.rows[0].total)})
        </span>
      </p>

      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/admin/accounting?status=${f.value}` : "/admin/accounting"}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${
              status === f.value ? "bg-rouille text-sur-rouille border-rouille" : "border-trait text-pierre hover:bg-sable"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {invoicesRes.rows.length === 0 ? (
        <div className="card p-10 text-center text-pierre">Aucune facture pour l'instant.</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="scroll-x">
            <table className="w-full text-sm min-w-[560px] tabular-nums">
              <thead className="text-pierre text-[13px] font-bold">
                <tr>
                  <th className="text-left font-bold px-4 py-3">Numéro</th>
                  <th className="text-left font-bold px-4 py-3">Client</th>
                  <th className="text-left font-bold px-4 py-3">Date</th>
                  <th className="text-right font-bold px-4 py-3">Montant</th>
                  <th className="text-right font-bold px-4 py-3">Payé</th>
                  <th className="text-left font-bold px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {invoicesRes.rows.map((inv) => (
                  <tr key={inv.id} className="border-t border-trait hover:bg-sable transition-colors">
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
                    <td className="px-4 py-3 text-right text-pierre">{formatEUR(inv.paid_amount)}</td>
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
