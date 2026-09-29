import { adminPageGuard } from "@/lib/auth";
import Link from "next/link";
import { query } from "@/lib/db";
import { formatDateLongFR, formatEUR, todayISO, toCardVisit } from "@/lib/utils";
import VisitCard from "@/components/VisitCard";
import NextVisitBanner from "@/components/NextVisitBanner";
import { Plus } from "@phosphor-icons/react/ssr";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const today = todayISO();

  const [visitsRes, unbilledRes, unpaidRes, clientCountRes] = await Promise.all([
    query(
      `SELECT v.*, p.name AS pet_name, c.first_name, c.last_name, c.address, i.status AS invoice_status,
        (SELECT COUNT(*) FROM tasks t WHERE t.visit_id = v.id) AS task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.visit_id = v.id AND t.done) AS task_done_count,
        (SELECT COUNT(*) FROM photos ph WHERE ph.visit_id = v.id) AS photo_count
       FROM visits v JOIN pets p ON p.id = v.pet_id JOIN clients c ON c.id = v.client_id
       LEFT JOIN invoices i ON i.id = v.invoice_id
       WHERE v.date = $1
       ORDER BY v.start_time ASC NULLS LAST`,
      [today]
    ),
    query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(CASE WHEN is_free THEN 0 ELSE price + COALESCE(travel_fee,0) END),0) AS total FROM visits WHERE invoice_id IS NULL AND status = 'FAIT'`
    ),
    query(
      `SELECT COALESCE(SUM(total_ttc - COALESCE((SELECT SUM(amount) FROM payments p WHERE p.invoice_id = i.id),0)),0) AS total
       FROM invoices i WHERE status != 'PAYEE' AND NOT i.is_test`
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
  await adminPageGuard();
  const { today, visits, unbilled, unpaidTotal } = await getDashboardData();

  // Résumé de la journée (hors visites annulées)
  const active = visits.filter((v) => v.status !== "ANNULE");
  const done = active.filter((v) => v.status === "FAIT");
  const unbilledCount = Number(unbilled.count);

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
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-pierre text-sm mb-1 capitalize">{formatDateLongFR(today)}</p>
          <h1 className="font-display text-3xl font-semibold text-encre">Aujourd'hui</h1>
        </div>
        {/* Masqué sur mobile (bouton « + » de la barre d'onglets) ; enveloppé dans
            un div car .btn-primary (hors @layer) écraserait la classe hidden. */}
        <div className="hidden md:block">
          <Link href={`/admin/visits/new?date=${today}`} className="btn-primary gap-2">
            <Plus size={20} aria-hidden="true" />
            Planifier
          </Link>
        </div>
      </div>

      {/* Une seule ligne de chiffres, discrète */}
      <p className="text-sm text-pierre tabular-nums flex flex-wrap gap-x-2 gap-y-1">
        <span>
          {active.length === 0
            ? "Aucune visite"
            : `${done.length} visite${done.length > 1 ? "s" : ""} sur ${active.length} terminée${done.length > 1 ? "s" : ""}`}
        </span>
        <span aria-hidden="true">·</span>
        <Link href="/admin/accounting" className="hover:text-encre hover:underline">
          {unbilledCount} à facturer ({formatEUR(unbilled.total)})
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/admin/accounting" className="hover:text-encre hover:underline">
          {formatEUR(unpaidTotal)} impayés
        </Link>
      </p>

      <NextVisitBanner visits={bannerVisits} />

      <div>
        <h2 className="font-display text-xl font-semibold mb-3">Visites du jour</h2>
        {visits.length === 0 ? (
          <div className="card p-8 text-center text-pierre">
            Aucune visite prévue aujourd'hui.{" "}
            <Link href={`/admin/visits/new?date=${today}`} className="text-rouille underline">
              Planifier une visite
            </Link>
          </div>
        ) : (
          <>
            <div className="list-group">
              {visits.map((v) => (
                <VisitCard key={`${v.id}-${v.status}-${v.photo_count}`} visit={toCardVisit(v)} />
              ))}
            </div>
            <p className="text-sm text-pierre md:hidden text-center pt-3">
              Glisse une visite vers la droite pour la démarrer, vers la gauche pour la terminer.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
