import Link from "next/link";
import { clientPageGuard } from "@/lib/auth";
import { query } from "@/lib/db";
import PortalNav from "@/components/PortalNav";

export default async function PortalLayout({ children }) {
  const user = await clientPageGuard();
  const { rows } = await query("SELECT * FROM clients WHERE id = $1", [user.client_id]);
  const client = rows[0];

  return (
    <div className="min-h-screen flex flex-col">
      <PortalNav clientName={client ? `${client.first_name} ${client.last_name}` : ""} />
      <main className="flex-1 px-4 py-6 md:px-8 md:py-10 max-w-3xl mx-auto w-full">{children}</main>
      <footer className="text-center text-xs text-muted py-4">
        <Link href="/mentions-legales" className="underline hover:text-ink">
          Mentions légales
        </Link>
        {" · "}
        <Link href="/confidentialite" className="underline hover:text-ink">
          Confidentialité
        </Link>
        {" · "}
        <Link href="/compte/mot-de-passe" className="underline hover:text-ink">
          Changer mon mot de passe
        </Link>
      </footer>
    </div>
  );
}
