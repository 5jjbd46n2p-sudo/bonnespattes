import { redirect } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { query } from "@/lib/db";
import PortalNav from "@/components/PortalNav";

export default async function PortalLayout({ children }) {
  const user = await requireClient();
  if (!user) redirect("/login");
  const { rows } = await query("SELECT * FROM clients WHERE id = $1", [user.client_id]);
  const client = rows[0];

  return (
    <div className="min-h-screen flex flex-col">
      <PortalNav clientName={client ? `${client.first_name} ${client.last_name}` : ""} />
      <main className="flex-1 px-4 py-6 md:px-8 md:py-10 max-w-3xl mx-auto w-full">{children}</main>
    </div>
  );
}
