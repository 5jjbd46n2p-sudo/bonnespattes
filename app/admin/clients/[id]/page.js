import Link from "next/link";
import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { formatDateFR, formatEUR } from "@/lib/utils";
import { InvoiceStatusBadge } from "@/components/StatusBadge";
import ClientInfoCard from "@/components/ClientInfoCard";
import PetManager from "@/components/PetManager";
import ClientLoginManager from "@/components/ClientLoginManager";
import DepositManager from "@/components/DepositManager";
import ClientContractCard from "@/components/ClientContractCard";
import VisitHistory from "@/components/VisitHistory";
import { ArrowLeft, Plus } from "@phosphor-icons/react/ssr";

export const dynamic = "force-dynamic";

async function getClientData(id) {
  const clientRes = await query("SELECT * FROM clients WHERE id = $1", [id]);
  if (!clientRes.rows[0]) return null;
  const petsRes = await query("SELECT * FROM pets WHERE client_id = $1 ORDER BY created_at", [id]);
  const visitsRes = await query(
    `SELECT v.*, p.name AS pet_name, i.status AS invoice_status, i.is_test AS invoice_is_test,
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

  let referral = { code: clientRes.rows[0].referral_code || null, credits: [], balance: 0 };
  try {
    const cr = await query(
      "SELECT amount, reason, used_at, created_at FROM client_credits WHERE client_id = $1 ORDER BY created_at DESC",
      [id]
    );
    referral.credits = cr.rows;
    referral.balance = cr.rows.filter((c) => !c.used_at).reduce((s, c) => s + Number(c.amount), 0);
  } catch {
    // table pas encore créée
  }

  let contracts = [];
  try {
    const contractsRes = await query(
      "SELECT id, version, status, sent_at, sent_to, signed_at, expires_at FROM contract_signatures WHERE client_id = $1 ORDER BY created_at DESC",
      [id]
    );
    contracts = contractsRes.rows;
  } catch {
    contracts = [];
  }

  return {
    referral,
    contracts,
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
  const { client, pets, visits, invoices, login, deposits, referral, contracts } = data;

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

          <VisitHistory visits={visits} />
        </div>

        <div className="space-y-6">
          <ClientContractCard clientId={id} hasEmail={!!client.email} signatures={contracts} />
          <ClientLoginManager clientId={id} login={login} />
          <DepositManager clientId={id} deposits={deposits} />

          {(referral.code || referral.credits.length > 0) && (
            <div className="card p-5">
              <h2 className="font-display text-xl font-semibold mb-3">Parrainage</h2>
              {referral.code && (
                <p className="text-sm">
                  <span className="label">Code : </span>
                  <span className="font-bold tabular-nums tracking-wide">{referral.code}</span>
                </p>
              )}
              <p className="text-sm mt-1 tabular-nums">
                <span className="label">Crédit disponible : </span>
                <span className="font-bold">{formatEUR(referral.balance)}</span>
              </p>
              {referral.credits.length > 0 && (
                <ul className="divide-y divide-trait -mx-5 mt-3 border-t border-trait">
                  {referral.credits.map((c, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                      <span>
                        {c.reason}
                        <span className="block text-pierre tabular-nums">
                          {formatDateFR(c.created_at)}
                          {c.used_at ? " · utilisé" : ""}
                        </span>
                      </span>
                      <span className="font-bold tabular-nums">{formatEUR(c.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

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
