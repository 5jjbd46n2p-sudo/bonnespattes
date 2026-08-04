import Link from "next/link";
import { query } from "@/lib/db";
import { formatDateLongFR, wazeUrl } from "@/lib/utils";
import { VisitStatusBadge } from "@/components/StatusBadge";
import VisitQuickActions from "@/components/VisitQuickActions";
import QuickAddVisit from "@/components/QuickAddVisit";

export const dynamic = "force-dynamic";

function toISO(d) {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0 = dimanche
  const diff = day === 0 ? -6 : 1 - day; // lundi comme premier jour
  date.setDate(date.getDate() + diff);
  return date;
}

export default async function PlanningPage({ searchParams }) {
  const sp = await searchParams;
  const selected = sp.date || toISO(new Date());
  const weekStart = startOfWeek(new Date(selected + "T00:00:00"));
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return toISO(d);
  });

  const countsRes = await query(
    `SELECT date::text, COUNT(*) AS count FROM visits WHERE date = ANY($1::date[]) GROUP BY date`,
    [weekDays]
  );
  const counts = Object.fromEntries(countsRes.rows.map((r) => [r.date, Number(r.count)]));

  const visitsRes = await query(
    `SELECT v.*, p.name AS pet_name, c.first_name, c.last_name, c.address,
      (SELECT COUNT(*) FROM tasks t WHERE t.visit_id = v.id) AS task_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.visit_id = v.id AND t.done) AS task_done_count,
      (SELECT COUNT(*) FROM photos ph WHERE ph.visit_id = v.id) AS photo_count
     FROM visits v JOIN pets p ON p.id = v.pet_id JOIN clients c ON c.id = v.client_id
     WHERE v.date = $1 ORDER BY v.start_time ASC NULLS LAST`,
    [selected]
  );

  const clientsRes = await query("SELECT id, first_name, last_name FROM clients ORDER BY last_name");

  const prevWeek = toISO(new Date(new Date(weekStart).setDate(weekStart.getDate() - 7)));
  const nextWeek = toISO(new Date(new Date(weekStart).setDate(weekStart.getDate() + 7)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-3xl font-semibold text-forest-dark">Planning</h1>
        <QuickAddVisit clients={clientsRes.rows} />
      </div>

      <div className="card p-3">
        <div className="flex items-center justify-between mb-2">
          <Link href={`/admin/planning?date=${prevWeek}`} className="text-sm text-muted hover:underline">
            ← Semaine préc.
          </Link>
          <Link href={`/admin/planning?date=${toISO(new Date())}`} className="text-sm text-forest underline">
            Aujourd'hui
          </Link>
          <Link href={`/admin/planning?date=${nextWeek}`} className="text-sm text-muted hover:underline">
            Semaine suiv. →
          </Link>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((d) => {
            const isSelected = d === selected;
            const isToday = d === toISO(new Date());
            const date = new Date(d + "T00:00:00");
            return (
              <Link
                key={d}
                href={`/admin/planning?date=${d}`}
                className={`text-center rounded-lg py-2 px-1 transition-colors ${
                  isSelected ? "bg-forest text-white" : isToday ? "bg-sand-dark" : "hover:bg-sand-dark/60"
                }`}
              >
                <div className="text-[10px] uppercase tracking-wide opacity-75">
                  {date.toLocaleDateString("fr-FR", { weekday: "short" })}
                </div>
                <div className="font-semibold text-sm">{date.getDate()}</div>
                {counts[d] > 0 && (
                  <div className={`text-[10px] mt-0.5 ${isSelected ? "text-white/90" : "text-muted"}`}>
                    {counts[d]} visite{counts[d] > 1 ? "s" : ""}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="font-display text-xl font-semibold mb-3 capitalize">{formatDateLongFR(selected)}</h2>
        {visitsRes.rows.length === 0 ? (
          <div className="card p-8 text-center text-muted">Aucune visite ce jour-là.</div>
        ) : (
          <div className="space-y-3">
            {visitsRes.rows.map((v) => (
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
                    <span>📷 {v.photo_count}</span>
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
