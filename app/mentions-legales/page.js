import Link from "next/link";
import { query } from "@/lib/db";
import { ArrowLeft } from "@phosphor-icons/react/ssr";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mentions légales — Aux Bonnes Pattes",
};

function Missing() {
  return <span className="text-rouille font-bold">à compléter dans Réglages</span>;
}

export default async function MentionsLegalesPage() {
  const { rows } = await query("SELECT * FROM settings LIMIT 1");
  const s = rows[0] || {};

  return (
    <div className="min-h-screen bg-papier">
      <div className="max-w-[720px] mx-auto px-4 md:px-8 py-10 space-y-8">
        <div>
          <Link href="/" aria-label="Aux Bonnes Pattes, retour à l'accueil" className="inline-block">
            <Logo size={28} className="text-encre" />
          </Link>
          <Link href="/" className="mt-6 text-sm text-pierre hover:underline flex items-center gap-1 w-fit">
            <ArrowLeft size={16} aria-hidden="true" />
            Retour
          </Link>
          <h1 className="font-display text-3xl font-semibold text-encre mt-2">Mentions légales</h1>
        </div>

        <div className="card divide-y divide-trait">
        <section className="p-5 space-y-2 leading-relaxed">
          <h2 className="font-display text-xl font-semibold text-encre mb-1">Éditeur du site</h2>
          <p>
            Nom / raison sociale : {s.business_name || <Missing />}
            <br />
            Statut juridique : {s.legal_form || <Missing />}
            <br />
            SIRET : {s.siret || <Missing />}
            <br />
            Adresse : {s.business_address || <Missing />}
            <br />
            Contact : {s.contact_email || <Missing />}
          </p>
          <p className="text-pierre text-sm">
            Responsable de la publication : le responsable de l'activité mentionnée ci-dessus.
          </p>
        </section>

        <section className="p-5 space-y-2 leading-relaxed">
          <h2 className="font-display text-xl font-semibold text-encre mb-1">Hébergement</h2>
          <p>
            Ce site est hébergé par <strong>Vercel Inc.</strong>, 340 S Lemon Ave #4133, Walnut, CA 91789,
            États-Unis —{" "}
            <a href="https://vercel.com/legal" target="_blank" rel="noopener noreferrer" className="text-rouille underline">
              vercel.com/legal
            </a>
            .
          </p>
          <p>
            La base de données est hébergée par <strong>Neon</strong> (Neon, Inc.) —{" "}
            <a href="https://neon.tech/legal" target="_blank" rel="noopener noreferrer" className="text-rouille underline">
              neon.tech/legal
            </a>
            . Les photos de visite sont stockées via <strong>Vercel Blob</strong>, fourni par le même hébergeur.
          </p>
        </section>

        <section className="p-5 space-y-2 leading-relaxed">
          <h2 className="font-display text-xl font-semibold text-encre mb-1">Propriété intellectuelle</h2>
          <p>
            L'ensemble des contenus de ce site (textes, mise en page) est réservé à l'usage exclusif de son
            éditeur, sauf mention contraire.
          </p>
        </section>

        <section className="p-5 space-y-2 leading-relaxed">
          <h2 className="font-display text-xl font-semibold text-encre mb-1">Contact</h2>
          <p>
            Pour toute question relative au site ou à son contenu :{" "}
            {s.contact_email ? (
              <a href={`mailto:${s.contact_email}`} className="text-rouille underline">
                {s.contact_email}
              </a>
            ) : (
              <Missing />
            )}
            . Voir aussi notre{" "}
            <Link href="/confidentialite" className="text-rouille underline">
              politique de confidentialité
            </Link>
            .
          </p>
        </section>
        </div>
      </div>
    </div>
  );
}
