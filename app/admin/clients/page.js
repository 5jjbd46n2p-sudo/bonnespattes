import Link from "next/link";
import { query } from "@/lib/db";

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
        <h1 className="font-display text-3xl font-semibold text-forest-dark">Clients</h1>
        <Link href="/admin/clients/new" className="btn-accent">
          + Nouveau client
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="card p-10 text-center text-muted">
          Aucun client pour l'instant.{" "}
          <Link href="/admin/clients/new" className="text-forest underline">
            Créer votre premier client
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/admin/clients/${c.id}`}
              className="card p-5 hover:shadow-md hover:-translate-y-0.5 transition-transform block"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-lg">
                    {c.first_name} {c.last_name}
                  </p>
                  <p className="text-sm text-muted mt-0.5">
                    {c.pet_count} animal{c.pet_count > 1 ? "aux" : ""}
                  </p>
                </div>
                {c.login_email ? (
                  <span className="badge bg-emerald-100 text-emerald-800">Accès actif</span>
                ) : (
                  <span className="badge bg-stone-200 text-stone-600">Pas d'accès</span>
                )}
              </div>
              {c.address && <p className="text-sm text-muted mt-3 truncate">📍 {c.address}</p>}
              {c.phone && <p className="text-sm text-muted mt-1">📞 {c.phone}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
