import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import NewVisitForm from "@/components/NewVisitForm";

export const dynamic = "force-dynamic";

export default async function NewVisitPage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const clientRes = await query("SELECT * FROM clients WHERE id = $1", [id]);
  if (!clientRes.rows[0]) notFound();
  const petsRes = await query("SELECT * FROM pets WHERE client_id = $1 ORDER BY name", [id]);

  return (
    <NewVisitForm client={clientRes.rows[0]} pets={petsRes.rows} initialDate={sp.date || undefined} />
  );
}
