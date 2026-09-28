import { requireClient } from "@/lib/auth";
import { query } from "@/lib/db";
import { formatDateFR, formatEUR } from "@/lib/utils";
import { VisitStatusBadge, InvoiceStatusBadge } from "@/components/StatusBadge";
import { Check, Circle, Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const user = await requireClient();
  const clientId = user.client_id;

  const petsRes = await query("SELECT * FROM pets WHERE client_id = $1 ORDER BY name", [clientId]);
  const visitsRes = await query(
    `SELECT v.*, p.name AS pet_name FROM visits v JOIN pets p ON p.id = v.pet_id
     WHERE v.client_id = $1 ORDER BY v.date DESC, v.start_time DESC LIMIT 50`,
    [clientId]
  );
  const visitIds = visitsRes.rows.map((v) => v.id);

  let tasksByVisit = {};
  let photosByVisit = {};
  if (visitIds.length) {
    const tasksRes = await query(
      `SELECT * FROM tasks WHERE visit_id = ANY($1::uuid[]) ORDER BY position`,
      [visitIds]
    );
    for (const t of tasksRes.rows) {
      (tasksByVisit[t.visit_id] ||= []).push(t);
    }
    const photosRes = await query(
      `SELECT * FROM photos WHERE visit_id = ANY($1::uuid[]) ORDER BY created_at DESC`,
      [visitIds]
    );
    for (const p of photosRes.rows) {
      (photosByVisit[p.visit_id] ||= []).push(p);
    }
  }

  const invoicesRes = await query(
    `SELECT i.*, (SELECT COALESCE(SUM(amount),0) FROM payments pay WHERE pay.invoice_id = i.id) AS paid_amount
     FROM invoices i WHERE client_id = $1 ORDER BY issue_date DESC`,
    [clientId]
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold text-forest-dark">
            Des nouvelles de {petsRes.rows.map((p) => p.name).join(" et ") || "vos animaux"}
          </h1>
          <p className="text-muted text-sm mt-1">
            Le compte rendu et les photos de chaque visite, dès qu&apos;ils sont enregistrés.
          </p>
        </div>
        <a href="/api/portal/export" className="btn-ghost text-sm !min-h-[40px] !py-1.5 !px-3 shrink-0 gap-1.5">
          <Download className="w-4 h-4" strokeWidth={1.9} />
          Télécharger mes données
        </a>
      </div>

      <div className="space-y-4">
        {visitsRes.rows.length === 0 ? (
          <div className="card p-8 text-center text-muted">Aucune visite pour le moment. Le compte rendu de la première visite apparaîtra ici.</div>
        ) : (
          visitsRes.rows.map((v) => {
            const tasks = tasksByVisit[v.id] || [];
            const photos = photosByVisit[v.id] || [];
            const doneCount = tasks.filter((t) => t.done).length;
            return (
              <div key={v.id} className="card p-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold">
                      {v.pet_name}
                      <span className="font-normal text-muted">
                        {" · "}
                        {formatDateFR(v.date)}
                        {v.start_time && ` à ${v.start_time.slice(0, 5)}`}
                      </span>
                    </p>
                    {tasks.length > 0 && (
                      <p className="text-xs text-muted mt-0.5">
                        {doneCount}/{tasks.length} tâches réalisées
                      </p>
                    )}
                  </div>
                  <VisitStatusBadge status={v.status} />
                </div>

                {tasks.length > 0 && (
                  <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {tasks.map((t) => (
                      <li key={t.id} className="text-sm flex items-center gap-2">
                        {t.done ? (
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={2.4} />
                        ) : (
                          <Circle className="w-4 h-4 text-stone-300 shrink-0" />
                        )}
                        <span className={t.done ? "" : "text-muted"}>{t.label}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {v.notes && <p className="text-sm mt-3 bg-sand-dark/50 rounded-lg px-3 py-2">{v.notes}</p>}

                {photos.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4">
                    {photos.map((p) => (
                      <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={p.url}
                          alt="Photo de la visite"
                          className="w-full h-24 object-cover rounded-lg border border-border"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {invoicesRes.rows.length > 0 && (
        <div>
          <h2 className="font-display text-xl font-bold mb-3">Vos factures</h2>
          <div className="card divide-y divide-border">
            {invoicesRes.rows.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-sm">{inv.number}</p>
                  <p className="text-xs text-muted">{formatDateFR(inv.issue_date)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{formatEUR(inv.total_ttc)}</span>
                  <InvoiceStatusBadge status={inv.status} />
                  <a
                    href={`/api/invoices/${inv.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-forest underline"
                  >
                    PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
