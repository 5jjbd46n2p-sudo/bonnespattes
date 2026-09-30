import { adminPageGuard } from "@/lib/auth";
import Link from "next/link";
import { query } from "@/lib/db";
import { formatDateFR, formatEUR } from "@/lib/utils";
import { InvoiceStatusBadge } from "@/components/StatusBadge";
import { DownloadSimple, Plus } from "@phosphor-icons/react/ssr";
import ToInvoiceGroup from "./ToInvoiceGroup";
import ChargesTab from "./ChargesTab";
import MarkPaidButton from "./MarkPaidButton";
import { SETTLED_BY_CREDIT_NOTE_SQL } from "@/lib/invoiceNumber";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "a-facturer", label: "À facturer" },
  { id: "a-encaisser", label: "À encaisser" },
  { id: "payees", label: "Payées" },
  { id: "charges", label: "Charges" },
];

export default async function AccountingPage({ searchParams }) {
  await adminPageGuard();
  const sp = await searchParams;
  const tab = TABS.some((t) => t.id === sp.tab) ? sp.tab : "a-facturer";

  const visitsRes = await query(
    `SELECT v.id, v.date, v.price, v.travel_fee, v.is_free, v.client_id, p.name AS pet_name,
            c.first_name, c.last_name
     FROM visits v
     JOIN pets p ON p.id = v.pet_id
     JOIN clients c ON c.id = v.client_id
     WHERE v.invoice_id IS NULL AND v.status = 'FAIT'
     ORDER BY c.last_name, c.first_name, v.date ASC`
  );

  const invoicesRes = await query(
    `SELECT i.*, c.first_name, c.last_name,
      (SELECT COALESCE(SUM(amount),0) FROM payments pay WHERE pay.invoice_id = i.id) AS paid_amount,
      ${SETTLED_BY_CREDIT_NOTE_SQL} AS settled
     FROM invoices i JOIN clients c ON c.id = i.client_id
     ORDER BY i.issue_date DESC, i.created_at DESC`
  );

  const summaryRes = await query(`
    SELECT
      COALESCE(SUM(total_ttc),0) AS total_ttc,
      COALESCE(SUM(total_ttc) FILTER (WHERE status = 'PAYEE'),0) AS total_paid,
      COALESCE(SUM(total_ttc) FILTER (WHERE status != 'PAYEE' AND NOT ${SETTLED_BY_CREDIT_NOTE_SQL}),0) AS total_unpaid
    FROM invoices i WHERE NOT is_test
  `);
  const summary = summaryRes.rows[0];

  // Visites à facturer, groupées par client
  const groups = [];
  const byClient = new Map();
  for (const v of visitsRes.rows) {
    let g = byClient.get(v.client_id);
    if (!g) {
      g = { clientId: v.client_id, clientName: `${v.first_name} ${v.last_name}`, visits: [] };
      byClient.set(v.client_id, g);
      groups.push(g);
    }
    g.visits.push({
      id: v.id,
      date: v.date,
      pet_name: v.pet_name,
      price: v.price,
      travel_fee: v.travel_fee,
      is_free: v.is_free,
    });
  }
  const unbilledTotal = visitsRes.rows.reduce(
    (s, v) => s + (v.is_free ? 0 : (Number(v.price) || 0) + (Number(v.travel_fee) || 0)),
    0
  );

  // Avoirs et factures annulées par un avoir : classés avec les factures réglées
  const toCollect = invoicesRes.rows.filter(
    (i) => !i.settled && ["BROUILLON", "ENVOYEE", "EN_RETARD"].includes(i.status)
  );
  const paid = invoicesRes.rows.filter((i) => i.settled || i.status === "PAYEE");
  const overdue = toCollect.filter((i) => i.status === "EN_RETARD");
  const overdueTotal = overdue.reduce((s, i) => s + Math.max(0, Number(i.total_ttc) - Number(i.paid_amount)), 0);
  const counts = { "a-facturer": visitsRes.rows.length, "a-encaisser": toCollect.length, payees: paid.length };

  // Simple fonction de rendu (pas un composant déclaré pendant le rendu)
  const renderInvoiceTable = ({ rows, collect }) =>
    rows.length === 0 ? (
      <div className="card p-10 text-center text-pierre">
        {collect ? "Rien à encaisser pour l'instant." : "Aucune facture réglée pour l'instant."}
      </div>
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
                {collect && <th className="text-right font-bold px-4 py-3">Reste à payer</th>}
                <th className="text-left font-bold px-4 py-3">Statut</th>
                {collect && <th className="px-4 py-3"><span className="sr-only">Action</span></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((inv) => {
                const balance = Math.max(0, Number(inv.total_ttc) - Number(inv.paid_amount));
                return (
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
                    {collect && <td className="px-4 py-3 text-right font-bold">{formatEUR(balance)}</td>}
                    <td className="px-4 py-3">
                      {inv.credit_note_of ? (
                        <span className="badge text-pierre">Avoir</span>
                      ) : inv.settled ? (
                        <span className="badge text-pierre">Annulée par avoir</span>
                      ) : (
                        <InvoiceStatusBadge status={inv.status} />
                      )}
                    </td>
                    {collect && (
                      <td className="px-4 py-3 text-right">
                        <MarkPaidButton invoiceId={inv.id} balance={balance} number={inv.number} />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );

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

      <p className="text-sm text-pierre tabular-nums flex flex-wrap gap-x-2 gap-y-1">
        <span>{formatEUR(summary.total_ttc)} facturés</span>
        <span aria-hidden="true">·</span>
        <span>{formatEUR(summary.total_paid)} encaissés</span>
        <span aria-hidden="true">·</span>
        <span>{formatEUR(summary.total_unpaid)} en attente</span>
        <span aria-hidden="true">·</span>
        <span>{formatEUR(unbilledTotal)} à facturer</span>
      </p>

      {overdue.length > 0 && (
        <div className="card p-4 border-brique" role="status">
          <p className="font-bold text-brique tabular-nums">
            {formatEUR(overdueTotal)} impayés en retard
          </p>
          <p className="text-sm text-pierre">
            {overdue.length} facture{overdue.length > 1 ? "s" : ""} en retard de paiement.
          </p>
        </div>
      )}

      <nav aria-label="Sections de la comptabilité">
        <ul className="flex gap-2 flex-wrap">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <li key={t.id}>
                <Link
                  href={`/admin/accounting?tab=${t.id}`}
                  aria-current={active ? "page" : undefined}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors inline-flex items-center gap-2 ${
                    active ? "bg-rouille text-sur-rouille border-rouille" : "border-trait text-pierre hover:bg-sable"
                  }`}
                >
                  {t.label}
                  {counts[t.id] !== undefined && <span className="tabular-nums font-normal">({counts[t.id]})</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {tab === "a-facturer" &&
        (groups.length === 0 ? (
          <div className="card p-10 text-center text-pierre">Toutes les visites terminées sont facturées.</div>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => (
              <ToInvoiceGroup key={g.clientId} clientId={g.clientId} clientName={g.clientName} visits={g.visits} />
            ))}
          </div>
        ))}
      {tab === "a-encaisser" && renderInvoiceTable({ rows: toCollect, collect: true })}
      {tab === "payees" && renderInvoiceTable({ rows: paid })}
      {tab === "charges" && <ChargesTab mois={sp.mois} />}
    </div>
  );
}
