import Link from "next/link";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Politique de confidentialité — Aux Bonnes Pattes",
};

function Missing() {
  return <span className="text-ochre-dark">à compléter dans Réglages</span>;
}

export default async function ConfidentialitePage() {
  const { rows } = await query("SELECT * FROM settings LIMIT 1");
  const s = rows[0] || {};
  const emailConfigured = !!process.env.RESEND_API_KEY;

  return (
    <div className="min-h-screen bg-sand">
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-10 space-y-8">
        <div>
          <Link href="/login" className="text-sm text-muted hover:underline">
            ← Retour
          </Link>
          <h1 className="font-display text-3xl font-semibold text-forest-dark mt-2">
            Politique de confidentialité
          </h1>
          <p className="text-muted text-sm mt-1">
            Cette page explique quelles données personnelles sont traitées par ce site, pourquoi, et
            comment exercer vos droits, conformément au Règlement Général sur la Protection des Données
            (RGPD).
          </p>
        </div>

        <section className="card p-5 space-y-2 text-sm leading-relaxed">
          <h2 className="font-semibold text-forest-dark text-base mb-1">Responsable de traitement</h2>
          <p>
            {s.business_name || <Missing />}
            {s.business_address ? `, ${s.business_address}` : ""}. Contact :{" "}
            {s.contact_email ? (
              <a href={`mailto:${s.contact_email}`} className="text-forest underline">
                {s.contact_email}
              </a>
            ) : (
              <Missing />
            )}
            .
          </p>
        </section>

        <section className="card p-5 space-y-3 text-sm leading-relaxed">
          <h2 className="font-semibold text-forest-dark text-base mb-1">Données collectées et finalités</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Identité et contact du client</strong> (nom, téléphone, email, adresse) : pour organiser
              et réaliser les visites, et établir les factures. Base légale : exécution du contrat de
              prestation.
            </li>
            <li>
              <strong>Informations sur les animaux</strong> (nom, espèce, race, notes de santé/habitudes) :
              nécessaires à la bonne réalisation des visites. Base légale : exécution du contrat.
            </li>
            <li>
              <strong>Historique des visites et photos</strong> : pour assurer le suivi du service et le
              partager avec le client via son espace personnel. Base légale : exécution du contrat.
            </li>
            <li>
              <strong>Identifiants de connexion</strong> (email, mot de passe stocké de façon chiffrée) : pour
              sécuriser l'accès à l'espace client. Base légale : exécution du contrat.
            </li>
            <li>
              <strong>Données de facturation</strong> (montants, paiements, acomptes) : pour la gestion
              comptable. Base légale : obligation légale et exécution du contrat.
            </li>
          </ul>
          <p>Aucune donnée n'est utilisée à des fins de prospection commerciale ou revendue à un tiers.</p>
        </section>

        <section className="card p-5 space-y-3 text-sm leading-relaxed">
          <h2 className="font-semibold text-forest-dark text-base mb-1">Destinataires des données</h2>
          <p>Les données ne sont accessibles qu'à l'administrateur du site (le prestataire de pet-sitting) et, pour ses propres données, à chaque client via son espace personnel. Elles sont hébergées chez les sous-traitants techniques suivants, qui n'y accèdent que pour assurer le fonctionnement du service :</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Vercel Inc.</strong> — hébergement du site et de l'application</li>
            <li><strong>Neon, Inc.</strong> — hébergement de la base de données</li>
            <li><strong>Vercel Blob</strong> — stockage des photos de visite</li>
            {emailConfigured && (
              <li><strong>Resend</strong> — envoi automatique des emails contenant les identifiants de connexion</li>
            )}
          </ul>
        </section>

        <section className="card p-5 space-y-2 text-sm leading-relaxed">
          <h2 className="font-semibold text-forest-dark text-base mb-1">Durée de conservation</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Données d'un client actif : conservées pendant toute la durée de la relation commerciale.</li>
            <li>
              Après la fin de la relation commerciale : les données peuvent être conservées pendant une
              durée raisonnable en cas de besoin, puis supprimées ou anonymisées à la demande du client (voir
              « Vos droits » ci-dessous).
            </li>
            <li>
              Factures et documents comptables : conservés 10 ans, conformément à l'obligation légale de
              conservation des documents commerciaux.
            </li>
            <li>Comptes de connexion : supprimés sur simple demande du client.</li>
          </ul>
        </section>

        <section className="card p-5 space-y-2 text-sm leading-relaxed">
          <h2 className="font-semibold text-forest-dark text-base mb-1">Sécurité</h2>
          <p>
            Le site est accessible uniquement en HTTPS (connexion chiffrée). Les mots de passe sont stockés
            sous forme hachée (jamais en clair) et l'accès aux comptes est protégé contre les tentatives de
            connexion répétées. L'accès à l'espace d'administration est réservé au seul prestataire.
          </p>
        </section>

        <section className="card p-5 space-y-2 text-sm leading-relaxed">
          <h2 className="font-semibold text-forest-dark text-base mb-1">Cookies</h2>
          <p>
            Ce site utilise uniquement un cookie strictement nécessaire à la connexion (maintien de votre
            session). Aucun cookie de mesure d'audience, de publicité ou de traceur tiers n'est utilisé —
            aucun bandeau de consentement n'est donc requis pour ce cookie, conformément à la réglementation
            applicable.
          </p>
        </section>

        <section className="card p-5 space-y-3 text-sm leading-relaxed">
          <h2 className="font-semibold text-forest-dark text-base mb-1">Vos droits</h2>
          <p>Conformément au RGPD, vous disposez des droits suivants sur vos données :</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Droit d'accès et de rectification</li>
            <li>Droit à l'effacement ("droit à l'oubli")</li>
            <li>
              Droit à la portabilité : depuis votre espace client, un bouton « Télécharger mes données »
              vous permet d'obtenir l'ensemble de vos données dans un fichier structuré.
            </li>
            <li>Droit d'opposition et de limitation du traitement</li>
          </ul>
          <p>
            Pour exercer ces droits, contactez :{" "}
            {s.contact_email ? (
              <a href={`mailto:${s.contact_email}`} className="text-forest underline">
                {s.contact_email}
              </a>
            ) : (
              <Missing />
            )}
            . Vous disposez également du droit d'introduire une réclamation auprès de la CNIL (
            <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-forest underline">
              www.cnil.fr
            </a>
            ) si vous estimez que vos droits ne sont pas respectés.
          </p>
        </section>

        <p className="text-xs text-muted">
          Voir aussi nos{" "}
          <Link href="/mentions-legales" className="text-forest underline">
            mentions légales
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
