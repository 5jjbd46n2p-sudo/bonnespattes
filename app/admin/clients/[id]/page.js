import Link from "next/link";
import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { formatDateFR, formatEUR } from "@/lib/utils";
import { VisitBillingBadge, InvoiceStatusBadge } from "@/components/StatusBadge";
import ClientInfoCard from "@/components/ClientInfoCard";
import PetManager from "@/components/PetManager";
import ClientLoginManager from "@/components/ClientLoginManager";
import DepositManager from "@/components/DepositManager";
import { ArrowLeft, Camera, CheckSquare, Plus } from "@phosphor-icons/react/ssr";

export const dynamic = "force-dynamic";

async function getClientData(id) {
  const clientRes = await query("SELECT * FROM clients WHERE id = $1", [id]);
  if (!clientRes.rows[0]) return null;
  const petsRes = await query("SELECT * FROM pets WHERE client_id = $1 ORDER BY created_at", [id]);
  const visitsRes = await query(
    `SELECT v.*, p.name AS pet_name, i.status AS invoice_status,
      (SELECT COUNT(*) FROM tasks t WHERE t.visit_id = v.id) AS task_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.visit_id = v.id AND t.done) AS task_done_count,
      (SELECT COUNT(*) FROM photos ph WHERE ph.visit_id = v.id) AS photo_count
     FROM visits v JOIN pets p ON p.id = v.pet_id
     LEFT JOIN invoices i ON i.id = v.invoice_id
     WHERE v.client_id = $1 ORDER BY v.date DESC, v.start_time DESC LIMIT 30`,
    [id]
  );
  const invoicesRes = await query(
    "SELECT * FROM invoices WHERE client_id = $1 ORDER BY issue_date DESC LIMIT 10",
    [id]
  );
  const loginRes = await query("SELECT id, email FROM users WHERE client_id = $1", [id]);
  const depositsRes = await query(
    `SELECT d.*, i.number AS invoice_number
     FROM deposits d LEFT JOIN invoices i ON i.id = d.invoice_id
     WHERE d.client_id = $1 ORDER BY d.date DESC, d.created_at DESC`,
    [id]
  );

  return {
    client: clientRes.rows[0],
    pets: petsRes.rows,
    visits: visitsRes.rows,
    invoices: invoicesRes.rows,
    login: loginRes.rows[0] || null,
    deposits: depositsRes.rows,
  };
}

export default async function ClientDetailPage({ params }) {
  const { id } = await params;
  const data = await getClientData(id);
  if (!data) notFound();
  const { client, pets, visits, invoices, login, deposits } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href="/admin/clients" className="text-sm text-pierre hover:underline inline-flex items-center gap-1">
          <ArrowLeft size={16} aria-hidden="true" />
          Clients
        </Link>
        <Link href={`/admin/clients/${id}/visits/new`} className="btn-primary gap-2">
          <Plus size={20} aria-hidden="true" />
          Planifier une visite
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ClientInfoCard client={client} invoiceCount={invoices.length} />
          <PetManager clientId={id} pets={pets} />

          <div className="card p-5">
            <h2 className="font-display text-xl font-semibold mb-3">Historique des visites</h2>
            {visits.length === 0 ? (
              <p className="text-sm text-pierre">Pas encore de visite.</p>
            ) : (
              <div className="divide-y divide-trait -mx-5 border-t border-trait">
                {visits.map((v) => (
                  <Link
                    key={v.id}
                    href={`/admin/visits/${v.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-sable transition-colors"
                  >
                    <div>
                      <p className="font-medium tabular-nums">
                        {formatDateFR(v.date)} {v.start_time ? `· ${v.start_time.slice(0, 5)}` : ""} · {v.pet_name}
                      </p>
                      <p className="text-sm text-pierre mt-0.5 flex items-center gap-3 tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <CheckSquare size={16} aria-hidden="true" />
                          {v.task_done_count}/{v.task_count} tâches
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Camera size={16} aria-hidden="true" />
                          {v.photo_count} photo{v.photo_count > 1 ? "s" : ""}
                        </span>
                      </p>
                    </div>
                    <VisitBillingBadge visit={v} invoiceStatus={v.invoice_status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <ClientLoginManager clientId={id} login={login} />
          <DepositManager clientId={id} deposits={deposits} />

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-xl font-semibold">Factures</h2>
              <Link href={`/admin/accounting/invoices/new?clientId=${id}`} className="text-sm text-rouille underline inline-flex items-center gap-1">
                <Plus size={16} aria-hidden="true" />
                Facturer
              </Link>
            </div>
            {invoices.length === 0 ? (
              <p className="text-sm text-pierre">Aucune facture pour ce client.</p>
            ) : (
              <div className="divide-y divide-trait -mx-5 border-t border-trait">
                {invoices.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/admin/accounting/invoices/${inv.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-sable transition-colors"
                  >
                    <div>
                      <p className="font-medium">{inv.number}</p>
                      <p className="text-sm text-pierre tabular-nums">{formatDateFR(inv.issue_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums">{formatEUR(inv.total_ttc)}</p>
                      <InvoiceStatusBadge status={inv.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
