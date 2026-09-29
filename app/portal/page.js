import { headers } from "next/headers";
import { requireClient } from "@/lib/auth";
import CopyLink from "@/components/landing/CopyLink";
import { query } from "@/lib/db";
import { formatDateFR, formatEUR } from "@/lib/utils";
import { VisitStatusBadge, InvoiceStatusBadge } from "@/components/StatusBadge";
import { CheckSquare, DownloadSimple, Gift, Square } from "@phosphor-icons/react/ssr";

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

  // Parrainage : tolérant si les colonnes/tables ne sont pas encore migrées.
  let referralCode = null;
  let credit = 10;
  let balance = 0;
  try {
    const c = await query("SELECT referral_code FROM clients WHERE id = $1", [clientId]);
    referralCode = c.rows[0]?.referral_code || null;
    const s = await query("SELECT referral_credit FROM settings LIMIT 1");
    if (s.rows[0]?.referral_credit != null) credit = Number(s.rows[0].referral_credit);
    const b = await query(
      "SELECT COALESCE(SUM(amount),0) AS total FROM client_credits WHERE client_id = $1 AND used_at IS NULL",
      [clientId]
    );
    balance = Number(b.rows[0]?.total || 0);
  } catch {
    referralCode = null;
  }
  let referralLink = "";
  if (referralCode) {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    const base = (process.env.NEXT_PUBLIC_APP_URL || (host ? `https://${host}` : "")).replace(/\/$/, "");
    referralLink = `${base}/?parrain=${referralCode}`;
  }

  const petNames = petsRes.rows.map((p) => p.name);
  const petLabel =
    petNames.length === 0
      ? "vos compagnons"
      : petNames.length === 1
      ? petNames[0]
      : `${petNames.slice(0, -1).join(", ")} et ${petNames[petNames.length - 1]}`;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-semibold text-encre">Les nouvelles de {petLabel}</h1>
          <p className="text-pierre mt-1">
            Après chaque passage, je vous laisse ici le compte rendu et les photos. — Aurore
          </p>
        </div>
        <a href="/api/portal/export" className="btn-ghost text-sm gap-2 !py-1.5 !px-3 shrink-0">
          <DownloadSimple size={20} aria-hidden="true" />
          Télécharger mes données
        </a>
      </div>

      {visitsRes.rows.length === 0 ? (
        <div className="card p-8 text-center text-pierre">
          Pas encore de visite. Vous retrouverez ici le compte rendu et les photos après chaque passage.
        </div>
      ) : (
        <ul className="card divide-y divide-trait overflow-hidden">
          {visitsRes.rows.map((v) => {
            const tasks = tasksByVisit[v.id] || [];
            const photos = photosByVisit[v.id] || [];
            const doneCount = tasks.filter((t) => t.done).length;
            return (
              <li key={v.id} className="p-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-bold tabular-nums">
                      {formatDateFR(v.date)} {v.start_time && `· ${v.start_time.slice(0, 5)}`} · {v.pet_name}
                    </p>
                    {tasks.length > 0 && (
                      <p className="text-sm text-pierre mt-0.5 tabular-nums">
                        {doneCount} sur {tasks.length} tâche{tasks.length > 1 ? "s" : ""} faite
                        {doneCount > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {v.is_free && <span className="text-mousse font-bold text-sm">Offerte</span>}
                    <VisitStatusBadge status={v.status} />
                  </div>
                </div>

                {tasks.length > 0 && (
                  <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {tasks.map((t) => (
                      <li key={t.id} className="flex items-center gap-2">
                        {t.done ? (
                          <CheckSquare size={20} weight="regular" className="text-mousse shrink-0" aria-label="Fait" />
                        ) : (
                          <Square size={20} className="text-pierre shrink-0" aria-label="Pas fait" />
                        )}
                        <span className={t.done ? "" : "text-pierre"}>{t.label}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {v.notes && <p className="mt-3 whitespace-pre-line">{v.notes}</p>}

                {photos.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4">
                    {photos.map((p) => (
                      <a key={p.id} href={`/api/photos/${p.id}/file`} target="_blank" rel="noopener noreferrer">
                        <img
                          src={`/api/photos/${p.id}/file`}
                          alt={`Photo de ${v.pet_name}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {referralCode && (
        <section className="card p-5 space-y-3" aria-labelledby="parrainage">
          <h2 id="parrainage" className="font-display text-xl font-semibold flex items-center gap-2">
            <Gift size={24} className="text-rouille" aria-hidden="true" />
            Parrainez un proche
          </h2>
          <p className="text-pierre leading-relaxed">
            Un ami ou un voisin a besoin d'une pet sitter ? Partagez-lui votre lien : quand il devient client,
            vous recevez chacun {formatEUR(credit)} de crédit, déduit de votre prochaine facture.
          </p>
          <CopyLink value={referralLink} />
          <p className="text-sm tabular-nums">
            Crédit disponible : <span className="font-bold">{formatEUR(balance)}</span>
          </p>
        </section>
      )}

      {invoicesRes.rows.length > 0 && (
        <div>
          <h2 className="font-display text-xl font-semibold mb-3">Vos factures</h2>
          <ul className="card divide-y divide-trait overflow-hidden">
            {invoicesRes.rows.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-3 flex-wrap px-5 py-3">
                <div>
                  <p className="font-bold">{inv.number}</p>
                  <p className="text-sm text-pierre tabular-nums">{formatDateFR(inv.issue_date)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold tabular-nums">{formatEUR(inv.total_ttc)}</span>
                  <InvoiceStatusBadge status={inv.status} />
                  <a
                    href={`/api/invoices/${inv.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-rouille underline"
                  >
                    PDF
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
