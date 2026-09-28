import Link from "next/link";
import { query } from "@/lib/db";
import { formatDateLongFR, todayISO, localISO, toCardVisit } from "@/lib/utils";
import { VISIT_STATUS, VISIT_STATUS_ORDER } from "@/components/StatusBadge";
import VisitCard from "@/components/VisitCard";

export const dynamic = "force-dynamic";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function toISO(d) {
  return localISO(d);
}

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0 = dimanche
  const diff = day === 0 ? -6 : 1 - day; // lundi comme premier jour
  date.setDate(date.getDate() + diff);
  return date;
}

function ymKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function parseYM(str) {
  const [y, m] = str.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

function addMonths(d, n) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default async function PlanningPage({ searchParams }) {
  const sp = await searchParams;
  const today = todayISO();
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(sp.date || "") ? sp.date : today;
  const selectedDate = new Date(selected + "T00:00:00");
  const view = sp.view === "week" ? "week" : "month";

  const monthKey = /^\d{4}-\d{2}$/.test(sp.month || "") ? sp.month : ymKey(selectedDate);
  const monthDate = parseYM(monthKey);

  // Construit la liste des jours à afficher dans la grille : un mois complet
  // (semaines pleines, comme l'app Calendrier iOS) ou une simple semaine.
  let cells;
  if (view === "week") {
    const weekStart = startOfWeek(selectedDate);
    cells = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  } else {
    const monthStart = monthDate;
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const gridStart = startOfWeek(monthStart);
    const gridEnd = startOfWeek(monthEnd);
    gridEnd.setDate(gridEnd.getDate() + 6);
    cells = [];
    const cursor = new Date(gridStart);
    while (cursor <= gridEnd) {
      cells.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  const cellISOs = cells.map(toISO);
  const rows = chunk(cells, 7);

  const countsRes = await query(
    `SELECT date::text, status, COUNT(*) AS count FROM visits WHERE date = ANY($1::date[]) GROUP BY date, status`,
    [cellISOs]
  );
  const statusByDate = {};
  for (const r of countsRes.rows) {
    if (!statusByDate[r.date]) statusByDate[r.date] = {};
    statusByDate[r.date][r.status] = Number(r.count);
  }

  const visitsRes = await query(
    `SELECT v.*, p.name AS pet_name, c.first_name, c.last_name, c.address,
      (SELECT COUNT(*) FROM tasks t WHERE t.visit_id = v.id) AS task_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.visit_id = v.id AND t.done) AS task_done_count,
      (SELECT COUNT(*) FROM photos ph WHERE ph.visit_id = v.id) AS photo_count
     FROM visits v JOIN pets p ON p.id = v.pet_id JOIN clients c ON c.id = v.client_id
     WHERE v.date = $1 ORDER BY v.start_time ASC NULLS LAST`,
    [selected]
  );

  const prevMonthKey = ymKey(addMonths(monthDate, -1));
  const nextMonthKey = ymKey(addMonths(monthDate, 1));
  const monthLabel = monthDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const weekStartForNav = startOfWeek(selectedDate);
  const prevWeekDate = new Date(weekStartForNav);
  prevWeekDate.setDate(prevWeekDate.getDate() - 7);
  const nextWeekDate = new Date(weekStartForNav);
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);

  function hrefFor({ v = view, month = monthKey, date = selected }) {
    return `/admin/planning?view=${v}&month=${month}&date=${date}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-3xl font-semibold text-forest-dark">Planning</h1>
        <Link href={`/admin/visits/new?date=${selected}`} className="btn-accent shrink-0">
          + Planifier
        </Link>
      </div>

      <div className="card p-3 sm:p-4">
        {/* En-tête : navigation mois/semaine + bouton "Aujourd'hui" + sélecteur de vue */}
        <div className="flex items-center justify-between mb-3">
          <Link
            href={
              view === "week"
                ? hrefFor({ date: toISO(prevWeekDate) })
                : hrefFor({ month: prevMonthKey })
            }
            className="w-9 h-9 flex items-center justify-center rounded-full text-lg text-muted hover:bg-sand-dark/60 transition-colors"
            aria-label="Précédent"
          >
            ‹
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="font-display text-lg sm:text-xl font-semibold capitalize">
              {view === "week"
                ? `Semaine du ${weekStartForNav.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}`
                : monthLabel}
            </h2>
            <Link href={hrefFor({ month: ymKey(new Date(today + "T00:00:00")), date: today })} className="text-xs text-forest underline shrink-0">
              Aujourd'hui
            </Link>
          </div>
          <Link
            href={
              view === "week"
                ? hrefFor({ date: toISO(nextWeekDate) })
                : hrefFor({ month: nextMonthKey })
            }
            className="w-9 h-9 flex items-center justify-center rounded-full text-lg text-muted hover:bg-sand-dark/60 transition-colors"
            aria-label="Suivant"
          >
            ›
          </Link>
        </div>

        <div className="flex justify-center mb-3">
          <div className="inline-flex rounded-full border border-border p-0.5 bg-sand-dark/30 text-sm">
            <Link
              href={hrefFor({ v: "month" })}
              className={`px-4 py-1 rounded-full font-medium transition-colors ${
                view === "month" ? "bg-forest text-white" : "text-muted"
              }`}
            >
              Mois
            </Link>
            <Link
              href={hrefFor({ v: "week" })}
              className={`px-4 py-1 rounded-full font-medium transition-colors ${
                view === "week" ? "bg-forest text-white" : "text-muted"
              }`}
            >
              Semaine
            </Link>
          </div>
        </div>

        {/* En-têtes des jours de la semaine */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted">
              {label}
            </div>
          ))}
        </div>

        {/* Grille du calendrier (mois complet ou semaine) */}
        <div className="space-y-0.5">
          {rows.map((row, ri) => (
            <div key={ri} className="grid grid-cols-7 gap-0.5">
              {row.map((date) => {
                const iso = toISO(date);
                const isSelected = iso === selected;
                const isToday = iso === today;
                const isCurrentMonth = view === "week" || date.getMonth() === monthDate.getMonth();
                const dayStatuses = statusByDate[iso] || {};
                const total = Object.values(dayStatuses).reduce((s, n) => s + n, 0);
                const activeDots = VISIT_STATUS_ORDER.filter((s) => dayStatuses[s] > 0);
                const cellMonth = ymKey(date);

                return (
                  <Link
                    key={iso}
                    href={`/admin/planning?view=${view}&month=${cellMonth}&date=${iso}`}
                    title={total > 0 ? `${total} visite${total > 1 ? "s" : ""}` : undefined}
                    className={`relative flex flex-col items-center justify-start rounded-xl transition-colors ${
                      view === "week" ? "py-3" : "py-1.5"
                    } ${isSelected ? "" : "hover:bg-sand-dark/50"}`}
                  >
                    <span
                      className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                        isSelected
                          ? "bg-forest text-white"
                          : isToday
                          ? "text-ochre-dark font-bold ring-1 ring-ochre/50"
                          : isCurrentMonth
                          ? "text-ink"
                          : "text-muted/40"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    <span className="flex items-center gap-0.5 h-2 mt-0.5">
                      {activeDots.map((s) => (
                        <span key={s} className={`w-1.5 h-1.5 rounded-full ${VISIT_STATUS[s].dot}`} />
                      ))}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Agenda du jour sélectionné, comme le volet du bas dans l'app Calendrier */}
      <div>
        <h2 className="font-display text-xl font-semibold mb-3 capitalize">{formatDateLongFR(selected)}</h2>
        {visitsRes.rows.length === 0 ? (
          <div className="card p-8 text-center text-muted">
            Aucune visite ce jour-là.{" "}
            <Link href={`/admin/visits/new?date=${selected}`} className="text-forest underline">
              Planifier une visite
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {visitsRes.rows.map((v) => (
              <VisitCard key={`${v.id}-${v.status}-${v.photo_count}`} visit={toCardVisit(v)} />
            ))}
            <p className="text-xs text-muted md:hidden text-center pt-1">
              Astuce : glisse une visite vers la droite pour la démarrer, vers la gauche pour la terminer.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
