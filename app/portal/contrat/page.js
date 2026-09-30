import { redirect } from "next/navigation";
import Link from "next/link";
import { clientPageGuard } from "@/lib/auth";
import { query } from "@/lib/db";
import ContractSigner from "@/app/contrat/[token]/ContractSigner";
import { ArrowLeft } from "@phosphor-icons/react/ssr";

export const dynamic = "force-dynamic";

export const metadata = { title: "Mon contrat - Aux Bonnes Pattes" };

function formatDateTimeFR(d) {
  return new Date(d).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default async function PortalContractPage() {
  const user = await clientPageGuard();
  const { rows } = await query(
    `SELECT id, version, content, expires_at FROM contract_signatures
     WHERE client_id = $1 AND status = 'ENVOYE' AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [user.client_id]
  );
  const sig = rows[0];
  if (!sig) redirect("/portal");

  return (
    <div className="space-y-4">
      <Link href="/portal" className="text-sm text-pierre hover:underline inline-flex items-center gap-1">
        <ArrowLeft size={16} aria-hidden="true" />
        Mon espace
      </Link>
      <ContractSigner
        signatureId={sig.id}
        content={sig.content}
        version={sig.version}
        expiresAt={formatDateTimeFR(sig.expires_at)}
      />
    </div>
  );
}
