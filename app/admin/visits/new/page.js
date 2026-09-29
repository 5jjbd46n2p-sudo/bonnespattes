import { query } from "@/lib/db";
import NewVisitForm from "@/components/NewVisitForm";
import { getPricingSettings } from "@/app/admin/visits/pricingSettings";

export const dynamic = "force-dynamic";

// Planification "sans client choisi à l'avance" : on arrive ici en cliquant sur
// "+ Planifier" (planning, accueil, barre d'onglets) et le client est demandé
// en premier dans le formulaire.
export default async function NewVisitPickClientPage({ searchParams }) {
  const sp = await searchParams;
  const initialDate = /^\d{4}-\d{2}-\d{2}$/.test(sp?.date || "") ? sp.date : undefined;

  const [clientsRes, petsRes, settings] = await Promise.all([
    query("SELECT id, first_name, last_name, address, hourly_rate, distance_km, travel_minutes FROM clients ORDER BY last_name, first_name"),
    query("SELECT id, name, client_id FROM pets ORDER BY name"),
    getPricingSettings(),
  ]);

  return <NewVisitForm clients={clientsRes.rows} pets={petsRes.rows} settings={settings} initialDate={initialDate} />;
}
