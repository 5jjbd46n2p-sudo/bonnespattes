import { adminPageGuard } from "@/lib/auth";
import Link from "next/link";
import { query } from "@/lib/db";
import LeadActions from "./LeadActions";
import { quoteLines, estimateText } from "@/lib/quote";
import { CaretDown, Phone, EnvelopeSimple } from "@phosphor-icons/react/ssr";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "NOUVEAU", label: "Nouvelles" },
  { key: "CONTACTE", label: "Contactées" },
  { key: "CLIENT", label: "Clients" },
  { key: "SANS_SUITE", label: "Sans suite" },
];
const SERVICES = { VISITE: "Visites à domicile", PROMENADE: "Promenades", LES_DEUX: "Visites et promenades" };

export default async function LeadsPage({ searchParams }) {
  await adminPageGuard();
  const sp = await searchParams;
  const raw = Array.isArray(sp?.status) ? sp.status[0] : sp?.status;
  const status = TABS.some((t) => t.key === raw) ? raw : "NOUVEAU";

  let settings = {};
  let counts = {};
  let leads = [];
  let unavailable = false;
  try {
    const st = await query("SELECT rate_30, rate_45, rate_60 FROM settings LIMIT 1").catch(() => ({ rows: [] }));
    settings = st.rows[0] || {};
    const c = await query("SELECT status, COUNT(*)::int AS n FROM leads GROUP BY status");
    for (const r of c.rows) counts[r.status] = r.n;
    const res = await query(
      `SELECT l.*, c.first_name AS referrer_first_name, c.last_name AS referrer_last_name
       FROM leads l LEFT JOIN clients c ON c.id = l.referrer_client_id
       WHERE l.status = $1 ORDER BY l.created_at DESC LIMIT 200`,
      [status]
    );
    leads = res.rows;
  } catch {
    unavailable = true;
  }

  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="font-display text-3xl font-semibold text-encre">Demandes</h1>

      {unavailable ? (
        <p className="text-pierre">Les demandes ne sont pas encore disponibles (base à mettre à jour).</p>
      ) : (
        <>
          <nav aria-label="Statut des demandes" className="flex gap-1 overflow-x-auto border-b border-trait">
            {TABS.map((t) => {
              const active = t.key === status;
              return (
                <Link
                  key={t.key}
                  href={`/admin/leads?status=${t.key}`}
                  aria-current={active ? "page" : undefined}
                  className={`px-3 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 -mb-px ${
                    active ? "border-rouille text-rouille" : "border-transparent text-pierre hover:text-encre"
                  }`}
                >
                  {t.label} <span className="tabular-nums">({counts[t.key] || 0})</span>
                </Link>
              );
            })}
          </nav>

          {leads.length === 0 ? (
            <p className="text-pierre">Aucune demande dans cette liste.</p>
          ) : (
            <ul className="list-group divide-y divide-trait bg-lin border border-trait rounded-lg overflow-hidden">
              {leads.map((l) => (
                <li key={l.id}>
                  <details className="group">
                    <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                      <div className="min-w-0">
                        <p className="font-bold truncate">
                          {l.name}
                          {l.kind === "DEVIS" && (
                            <span className="ml-2 align-middle text-xs font-bold px-2 py-0.5 rounded-full bg-sable text-rouille border border-trait">Devis</span>
                          )}
                        </p>
                        <p className="text-sm text-pierre truncate tabular-nums">
                          {new Date(l.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                          {l.commune ? ` · ${l.commune}` : ""}
                          {l.kind !== "DEVIS" && l.service ? ` · ${SERVICES[l.service] || l.service}` : ""}
                        </p>
                      </div>
                      <CaretDown size={20} className="shrink-0 text-pierre group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <div className="px-4 pb-4 space-y-3 text-[15px]">
                      <p className="flex flex-wrap gap-x-4 gap-y-1">
                        <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1.5 text-rouille underline">
                          <EnvelopeSimple size={18} aria-hidden="true" />
                          {l.email}
                        </a>
                        {l.phone && (
                          <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1.5 text-rouille underline">
                            <Phone size={18} aria-hidden="true" />
                            {l.phone}
                          </a>
                        )}
                      </p>
                      {l.kind === "DEVIS" && l.quote && (
                        <div className="bg-sable rounded-lg p-3 space-y-1">
                          {quoteLines(l.quote).map(([k, v]) => (
                            <p key={k}><span className="label">{k} : </span>{v}</p>
                          ))}
                          <p className="font-bold pt-1">{estimateText(l.quote, settings)}</p>
                          <p className="text-sm text-pierre">Indicatif : à vous de confirmer le devis et le déplacement.</p>
                        </div>
                      )}
                      {l.animals && <p><span className="label">Animaux : </span>{l.animals}</p>}
                      {l.message && <p className="whitespace-pre-line">{l.message}</p>}
                      {l.referrer_client_id && (
                        <p className="text-mousse font-bold text-sm">
                          Recommandé par{" "}
                          <Link href={`/admin/clients/${l.referrer_client_id}`} className="underline">
                            {[l.referrer_first_name, l.referrer_last_name].filter(Boolean).join(" ") || "un client"}
                          </Link>
                        </p>
                      )}
                      <LeadActions id={l.id} status={l.status} clientId={l.client_id} />
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
