import Link from "next/link";
import { query } from "@/lib/db";
import { formatDateLongFR, formatEUR, wazeUrl } from "@/lib/utils";
import { VisitStatusBadge } from "@/components/StatusBadge";
import VisitQuickActions from "@/components/VisitQuickActions";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const today = new Date().toISOString().slice(0, 10);

  const visitsRes = await query(
    `SELECT v.*, p.name AS pet_name, c.first_name, c.last_name, c.address,
      (SELECT COUNT(*) FROM tasks t WHERE t.visit_id = v.id) AS task_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.visit_id = v.id AND t.done) AS task_done_count,
      (SELECT COUNT(*) FROM photos ph WHERE ph.visit_id = v.id) AS photo_count
     FROM visits v JOIN pets p ON p.id = v.pet_id JOIN clients c ON c.id = v.client_id
     WHERE v.date = $1
     ORDER BY v.start_time ASC NULLS LAST`,
    [today]
  );

  const unbilledRes = await query(
    `SELECT COUNT(*) AS count, COALESCE(SUM(price),0) AS total FROM visits WHERE invoice_id IS NULL AND status = 'FAIT'`
  );

  const unpaidRes = await query(
    `SELECT COALESCE(SUM(total_ttc - COALESCE((SELECT SUM(amount) FROM payments p WHERE p.invoice_id = i.id),0)),0) AS total
     FROM invoices i WHERE status != 'PAYEE'`
  );

  const clientCountRes = await query(`SELECT COUNT(*) AS count FROM clients`);

  return {
    today,
    visits: visitsRes.rows,
    unbilled: unbilledRes.rows[0],
    unpaidTotal: Number(unpaidRes.rows[0].total),
    clientCount: Number(clientCountRes.rows[0].count),
  };
}

export default async function AdminDashboard() {
  const { today, visits, unbilled, unpaidTotal, clientCount } = await getDashboardData();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-muted text-sm mb-1">{formatDateLongFR(today)}</p>
        <h1 className="font-display text-3xl font-semibold text-forest-dark">
          Bonjour ! Voici la journée
        </h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Visites aujourd'hui" value={visits.length} icon="🐾" />
        <StatCard
          label="À facturer"
          value={`${unbilled.count} visite${unbilled.count > 1 ? "s" : ""}`}
          sub={formatEUR(unbilled.total)}
          icon="🧾"
        />
        <StatCard label="Impayés en cours" value={formatEUR(unpaidTotal)} icon="💶" accent />
        <StatCard label="Clients actifs" value={clientCount} icon="👥" />
      </div>

      <div className="leash-divider" />

      <div>
        <h2 className="font-display text-xl font-semibold mb-4">Planning du jour</h2>
        {visits.length === 0 ? (
          <div className="card p-8 text-center text-muted">
            Aucune visite prévue aujourd'hui.{" "}
            <Link href="/admin/planning" className="text-forest underline">
              Ajouter une visite
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {visits.map((v) => (
              <div key={v.id} className="card p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                <div className="w-20 shrink-0 font-semibold text-forest-dark">
                  {v.start_time ? v.start_time.slice(0, 5) : "—"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/admin/visits/${v.id}`} className="font-semibold hover:underline">
                      {v.pet_name} — {v.first_name} {v.last_name}
                    </Link>
                    <VisitStatusBadge status={v.status} />
                  </div>
                  <div className="text-sm text-muted mt-0.5 flex items-center gap-3 flex-wrap">
                    <span>
                      ✅ {v.task_done_count}/{v.task_count} tâches
                    </span>
                    <span>📷 {v.photo_count} photo{v.photo_count > 1 ? "s" : ""}</span>
                    {v.address && (
                      <a
                        href={wazeUrl(v.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-forest underline decoration-dotted underline-offset-4"
                      >
                        🧭 Waze
                      </a>
                    )}
                  </div>
                </div>
                <VisitQuickActions visitId={v.id} status={v.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, accent }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</span>
        <span>{icon}</span>
      </div>
      <p className={`font-display text-2xl font-semibold ${accent ? "text-ochre-dark" : "text-forest-dark"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
    </div>
  );
}
