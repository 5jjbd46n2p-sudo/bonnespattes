import Link from "next/link";
import { query } from "@/lib/db";
import { formatDateLongFR, formatEUR, todayISO, toCardVisit } from "@/lib/utils";
import VisitCard from "@/components/VisitCard";
import NextVisitBanner from "@/components/NextVisitBanner";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const today = todayISO();

  const [visitsRes, unbilledRes, unpaidRes, clientCountRes] = await Promise.all([
    query(
      `SELECT v.*, p.name AS pet_name, c.first_name, c.last_name, c.address,
        (SELECT COUNT(*) FROM tasks t WHERE t.visit_id = v.id) AS task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.visit_id = v.id AND t.done) AS task_done_count,
        (SELECT COUNT(*) FROM photos ph WHERE ph.visit_id = v.id) AS photo_count
       FROM visits v JOIN pets p ON p.id = v.pet_id JOIN clients c ON c.id = v.client_id
       WHERE v.date = $1
       ORDER BY v.start_time ASC NULLS LAST`,
      [today]
    ),
    query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(price),0) AS total FROM visits WHERE invoice_id IS NULL AND status = 'FAIT'`
    ),
    query(
      `SELECT COALESCE(SUM(total_ttc - COALESCE((SELECT SUM(amount) FROM payments p WHERE p.invoice_id = i.id),0)),0) AS total
       FROM invoices i WHERE status != 'PAYEE'`
    ),
    query(`SELECT COUNT(*) AS count FROM clients`),
  ]);

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

  // Résumé de la journée (hors visites annulées)
  const active = visits.filter((v) => v.status !== "ANNULE");
  const done = active.filter((v) => v.status === "FAIT");
  const earned = done.reduce((s, v) => s + Number(v.price || 0), 0);
  const photos = visits.reduce((s, v) => s + Number(v.photo_count || 0), 0);
  const tasksTotal = active.reduce((s, v) => s + Number(v.task_count || 0), 0);
  const tasksDone = active.reduce((s, v) => s + Number(v.task_done_count || 0), 0);
  const dayFinished = active.length > 0 && done.length === active.length;
  const progress = active.length ? Math.round((done.length / active.length) * 100) : 0;

  const bannerVisits = visits.map((v) => ({
    id: v.id,
    status: v.status,
    start_time: v.start_time,
    end_time: v.end_time,
    pet_name: v.pet_name,
    first_name: v.first_name,
    last_name: v.last_name,
    address: v.address,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-muted text-sm mb-1 capitalize">{formatDateLongFR(today)}</p>
          <h1 className="font-display text-3xl font-semibold text-forest-dark">Aujourd'hui</h1>
        </div>
        <Link href={`/admin/visits/new?date=${today}`} className="btn-accent hidden md:inline-flex">
          + Planifier
        </Link>
      </div>

      <NextVisitBanner visits={bannerVisits} />

      {active.length > 0 && (
        <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h2 className="font-display text-lg font-semibold">
              {dayFinished ? "🎉 Journée terminée, bravo !" : "Résumé de la journée"}
            </h2>
            <span className="text-sm font-semibold text-forest-dark tabular-nums">
              {done.length}/{active.length} visite{active.length > 1 ? "s" : ""}
            </span>
          </div>
          <div
            className="h-2 rounded-full bg-sand-dark overflow-hidden"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 text-center">
            <div>
              <p className="font-display text-xl font-semibold text-forest-dark">{formatEUR(earned)}</p>
              <p className="text-xs text-muted">générés aujourd'hui</p>
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-forest-dark">{photos}</p>
              <p className="text-xs text-muted">photo{photos > 1 ? "s" : ""} ajoutée{photos > 1 ? "s" : ""}</p>
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-forest-dark">
                {tasksDone}/{tasksTotal}
              </p>
              <p className="text-xs text-muted">tâches cochées</p>
            </div>
          </div>
          {dayFinished && unbilled.count > 0 && (
            <p className="text-sm text-muted mt-4">
              Pense à facturer :{" "}
              <Link href="/admin/accounting" className="text-forest underline">
                {unbilled.count} visite{unbilled.count > 1 ? "s" : ""} terminée{unbilled.count > 1 ? "s" : ""} non
                facturée{unbilled.count > 1 ? "s" : ""} ({formatEUR(unbilled.total)})
              </Link>
            </p>
          )}
        </div>
      )}

      <div>
        <h2 className="font-display text-xl font-semibold mb-3">Planning du jour</h2>
        {visits.length === 0 ? (
          <div className="card p-8 text-center text-muted">
            Aucune visite prévue aujourd'hui.{" "}
            <Link href={`/admin/visits/new?date=${today}`} className="text-forest underline">
              Planifier une visite
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {visits.map((v) => (
              <VisitCard key={`${v.id}-${v.status}-${v.photo_count}`} visit={toCardVisit(v)} />
            ))}
            <p className="text-xs text-muted md:hidden text-center pt-1">
              Astuce : glisse une visite vers la droite pour la démarrer, vers la gauche pour la terminer.
            </p>
          </div>
        )}
      </div>

      <div className="leash-divider" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Visites aujourd'hui" value={active.length} icon="🐾" />
        <StatCard
          label="À facturer"
          value={`${unbilled.count} visite${unbilled.count > 1 ? "s" : ""}`}
          sub={formatEUR(unbilled.total)}
          icon="🧾"
          href="/admin/accounting"
        />
        <StatCard label="Impayés en cours" value={formatEUR(unpaidTotal)} icon="💶" accent href="/admin/accounting" />
        <StatCard label="Clients actifs" value={clientCount} icon="👥" href="/admin/clients" />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, accent, href }) {
  const content = (
    <>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</span>
        <span>{icon}</span>
      </div>
      <p className={`font-display text-2xl font-semibold ${accent ? "text-ochre-dark" : "text-forest-dark"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="card p-4 block hover:shadow-md transition-shadow">
      {content}
    </Link>
  ) : (
    <div className="card p-4">{content}</div>
  );
}
