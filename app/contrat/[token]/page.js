import { query } from "@/lib/db";
import { hashToken } from "@/lib/contract";
import Logo from "@/components/Logo";
import ContractSigner from "./ContractSigner";
import { CheckCircle, Clock, DownloadSimple, WarningCircle } from "@phosphor-icons/react/ssr";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Contrat de prestation - Aux Bonnes Pattes",
  robots: { index: false, follow: false },
};

function maskEmail(email) {
  const [local = "", domain = ""] = String(email || "").split("@");
  if (!domain) return "";
  return `${local.slice(0, 1)}***@${domain}`;
}

function formatDateTimeFR(d) {
  return new Date(d).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-papier">
      <div className="max-w-[720px] mx-auto px-4 md:px-8 py-8 space-y-6">
        <Logo size={28} className="text-encre" />
        {children}
      </div>
    </div>
  );
}

function Notice({ icon: Icon, tone, title, children }) {
  return (
    <div className="card p-5 space-y-2">
      <h1 className="font-display text-2xl font-semibold text-encre flex items-center gap-2">
        <Icon size={24} className={tone} aria-hidden="true" />
        {title}
      </h1>
      <div className="text-pierre space-y-2">{children}</div>
    </div>
  );
}

export default async function ContratPage({ params }) {
  const { token } = await params;

  let sig = null;
  try {
    const { rows } = await query(
      `SELECT id, version, content, status, sent_to, sent_at, expires_at, signed_at, signer_name
       FROM contract_signatures WHERE token_hash = $1`,
      [hashToken(token)]
    );
    sig = rows[0] || null;
  } catch {
    sig = null;
  }

  if (!sig) {
    return (
      <Shell>
        <Notice icon={WarningCircle} tone="text-brique" title="Lien introuvable">
          <p>Ce lien de contrat n'est pas valide. Vérifiez que vous avez bien copié l'adresse complète reçue par email.</p>
          <p>En cas de doute, répondez à l'email reçu et je vous renverrai un lien. Aurore</p>
        </Notice>
      </Shell>
    );
  }

  if (sig.status === "SIGNE") {
    return (
      <Shell>
        <Notice icon={CheckCircle} tone="text-mousse" title="Contrat signé">
          <p>
            Ce contrat a été signé par {sig.signer_name || "vous"} le{" "}
            <span className="tabular-nums">{formatDateTimeFR(sig.signed_at)}</span>. Un exemplaire PDF vous a été envoyé par email.
          </p>
          <a href={`/api/contract/${token}/pdf`} className="btn-primary gap-2 inline-flex mt-2">
            <DownloadSimple size={20} aria-hidden="true" />
            Télécharger le PDF signé
          </a>
        </Notice>
      </Shell>
    );
  }

  if (sig.status === "ANNULE") {
    return (
      <Shell>
        <Notice icon={WarningCircle} tone="text-pierre" title="Lien remplacé">
          <p>Ce lien n'est plus valable : un contrat plus récent vous a été envoyé. Utilisez le lien du dernier email reçu.</p>
        </Notice>
      </Shell>
    );
  }

  if (new Date(sig.expires_at).getTime() < Date.now()) {
    return (
      <Shell>
        <Notice icon={Clock} tone="text-miel" title="Lien expiré">
          <p>Ce lien de signature n'est plus valable (il expire 14 jours après l'envoi).</p>
          <p>Répondez à l'email reçu ou contactez-moi, je vous en renverrai un nouveau. Aurore</p>
        </Notice>
      </Shell>
    );
  }

  return (
    <Shell>
      <ContractSigner
        token={token}
        content={sig.content}
        version={sig.version}
        maskedEmail={maskEmail(sig.sent_to)}
        expiresAt={formatDateTimeFR(sig.expires_at)}
      />
    </Shell>
  );
}
