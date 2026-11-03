import Link from "next/link";
import { EnvelopeSimple, InstagramLogo, WhatsappLogo } from "@phosphor-icons/react/ssr";
import Logo from "@/components/Logo";
import { whatsappHref } from "@/lib/landing";

const LINK = "underline underline-offset-4 decoration-trait hover:decoration-rouille py-2 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rouille";

// Pied de page : contact par e-mail (et WhatsApp entreprise s'il est configuré), liens légaux.
export default function SiteFooter({ area, email, whatsapp }) {
  const wa = whatsappHref(whatsapp);
  const mail = String(email || "").trim();
  return (
    <footer className="px-4 pt-10 pb-28 md:pb-10 border-t border-trait text-sm text-pierre">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div className="space-y-2">
          <Logo size={22} className="text-encre" />
          <p>{area}</p>
        </div>
        <nav aria-label="Pied de page" className="flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-1">
          {mail && (
            <a href={`mailto:${mail}`} className={`inline-flex items-center gap-1.5 ${LINK}`}>
              <EnvelopeSimple size={20} aria-hidden="true" />
              Écrire à Aurore
            </a>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 ${LINK}`}>
              <WhatsappLogo size={20} aria-hidden="true" />
              WhatsApp
            </a>
          )}
          <a
            href="https://www.instagram.com/auxbonnespattes/"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 ${LINK}`}
          >
            <InstagramLogo size={20} aria-hidden="true" />
            @auxbonnespattes
          </a>
          <Link href="/mentions-legales" className={LINK}>
            Mentions légales
          </Link>
          <Link href="/confidentialite" className={LINK}>
            Confidentialité
          </Link>
          <Link href="/login" className={LINK}>
            Espace client
          </Link>
        </nav>
      </div>
    </footer>
  );
}
