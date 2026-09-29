import Link from "next/link";
import { query } from "@/lib/db";
import { MapPin, Phone, Plus } from "@phosphor-icons/react/ssr";

export const dynamic = "force-dynamic";

async function getClients() {
  const { rows } = await query(`
    SELECT c.*,
      (SELECT COUNT(*) FROM pets p WHERE p.client_id = c.id) AS pet_count,
      (SELECT u.email FROM users u WHERE u.client_id = c.id LIMIT 1) AS login_email
    FROM clients c ORDER BY c.last_name, c.first_name
  `);
  return rows;
}

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-3xl font-semibold text-encre">Clients</h1>
        <Link href="/admin/clients/new" className="btn-primary gap-2">
          <Plus size={20} aria-hidden="true" />
          Nouveau client
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="card p-10 text-center text-pierre">
          Aucun client pour l'instant.{" "}
          <Link href="/admin/clients/new" className="text-rouille underline">
            Créer ton premier client
          </Link>
        </div>
      ) : (
        <ul className="card divide-y divide-trait overflow-hidden">
          {clients.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/clients/${c.id}`}
                className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-sable transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-semibold">
                    {c.first_name} {c.last_name}
                    <span className="font-normal text-pierre">
                      {" "}
                      · {c.pet_count} animal{c.pet_count > 1 ? "aux" : ""}
                    </span>
                  </p>
                  <div className="text-sm text-pierre mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5">
                    {c.address && (
                      <span className="inline-flex items-center gap-1 min-w-0 max-w-full">
                        <MapPin size={16} aria-hidden="true" className="shrink-0" />
                        <span className="truncate">{c.address}</span>
                      </span>
                    )}
                    {c.phone && (
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Phone size={16} aria-hidden="true" className="shrink-0" />
                        {c.phone}
                      </span>
                    )}
                  </div>
                </div>
                <span className="inline-flex items-center gap-2 text-[13px] font-bold text-pierre shrink-0 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${c.login_email ? "bg-mousse" : "bg-muted"}`}
                    aria-hidden="true"
                  />
                  {c.login_email ? "Accès actif" : "Pas d'accès"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
