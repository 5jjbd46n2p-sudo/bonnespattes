import Link from "next/link";
import { query } from "@/lib/db";
import { ArrowLeft } from "@phosphor-icons/react/ssr";
import Logo from "@/components/Logo";
import { RETENTION } from "@/lib/privacy";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Politique de confidentialité · Aux Bonnes Pattes",
};

// Date de la dernière mise à jour du contenu de cette page
const UPDATED = "30 septembre 2026";

function Missing() {
  return <span className="text-rouille font-bold">à compléter dans Réglages</span>;
}

function Section({ title, children }) {
  return (
    <section className="p-5 space-y-3 leading-relaxed">
      <h2 className="font-display text-xl font-semibold text-encre mb-1">{title}</h2>
      {children}
    </section>
  );
}

function Contact({ email }) {
  return email ? (
    <a href={`mailto:${email}`} className="text-rouille underline">
      {email}
    </a>
  ) : (
    <Missing />
  );
}

// Lieu d'hébergement de la base, déduit de sa configuration (région Neon)
function databaseLocation() {
  const url = process.env.DATABASE_URL || "";
  if (/\.eu-|\beu-(central|west)/.test(url)) return "dans l'Union européenne";
  if (/\.us-|\bus-(east|west)/.test(url)) return "aux États-Unis";
  return "chez le prestataire indiqué";
}

export default async function ConfidentialitePage() {
  const { rows } = await query("SELECT * FROM settings LIMIT 1");
  const s = rows[0] || {};
  const R = RETENTION;

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
          <h1 className="font-display text-3xl font-semibold text-encre mt-2">Politique de confidentialité</h1>
          <p className="text-pierre mt-2">
            Cette page explique quelles données personnelles sont traitées, pourquoi, combien de temps elles
            sont conservées et comment exercer vos droits, conformément au Règlement général sur la
            protection des données (RGPD) et à la loi Informatique et Libertés. Mise à jour le {UPDATED}.
          </p>
        </div>

        <div className="card divide-y divide-trait">
          <Section title="Responsable de traitement">
            <p>
              {s.business_name || <Missing />}
              {s.legal_form ? ` (${s.legal_form})` : ""}
              {s.business_address ? `, ${s.business_address}` : ""}. Contact : <Contact email={s.contact_email} />.
            </p>
          </Section>

          <Section title="Données traitées, finalités et bases légales">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Demandes de contact et de devis</strong> (nom, email, téléphone, commune, animaux,
                message, code de parrainage éventuel) : répondre à votre demande et établir un devis. Base
                légale : mesures précontractuelles prises à votre demande.
              </li>
              <li>
                <strong>Clients</strong> : identité et coordonnées (nom, téléphone, email, adresse), consignes
                d&apos;accès au domicile, informations sur les animaux (espèce, race, âge, alimentation, santé,
                numéro d&apos;identification), historique et compte rendu des visites, photos prises pendant les
                visites. Finalité : organiser et réaliser les gardes et vous en rendre compte. Base légale :
                exécution du contrat.
              </li>
              <li>
                <strong>Contrat signé en ligne</strong> : texte du contrat, nom du signataire, date et heure,
                adresse IP et navigateur utilisés, adresse email ayant reçu le code de signature. Finalité :
                prouver la signature du contrat. Base légale : exécution du contrat et intérêt légitime à
                conserver une preuve.
              </li>
              <li>
                <strong>Personne à prévenir en cas d&apos;urgence et vétérinaire</strong> : coordonnées que vous
                nous communiquez pour pouvoir agir en cas de problème pendant une garde. Base légale : intérêt
                légitime (sécurité de l&apos;animal). Merci d&apos;informer cette personne que vous nous avez
                transmis ses coordonnées.
              </li>
              <li>
                <strong>Facturation</strong> (factures, paiements, acomptes, crédits de parrainage) : gestion
                comptable. Base légale : obligation légale (Code de commerce, Code général des impôts) et
                exécution du contrat.
              </li>
              <li>
                <strong>Espace client</strong> (email de connexion, mot de passe stocké uniquement sous forme
                chiffrée irréversible) : sécuriser l&apos;accès à vos informations. Base légale : exécution du
                contrat.
              </li>
              <li>
                <strong>Sécurité du site</strong> : empreintes non réversibles des adresses IP utilisées pour
                limiter les tentatives de connexion abusives et les envois en masse. Base légale : intérêt
                légitime (protection du service et de vos données).
              </li>
            </ul>
            <p>
              Aucune donnée n&apos;est vendue ni cédée, aucune n&apos;est utilisée pour de la publicité ou
              du profilage, et aucune décision n&apos;est prise de façon automatisée.
            </p>
          </Section>

          <Section title="Qui a accès aux données">
            <p>
              Seule la prestataire (administratrice du site) accède à l&apos;ensemble des données. Chaque
              client ne voit que ses propres informations dans son espace personnel. Les prestataires
              techniques suivants hébergent ou transmettent les données pour notre compte, sans pouvoir les
              utiliser pour eux-mêmes :
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Vercel Inc.</strong> (États-Unis) : hébergement du site et stockage privé des photos.
              </li>
              <li>
                <strong>Neon Inc.</strong> : base de données, hébergée {databaseLocation()}.
              </li>
              <li>
                <strong>Resend Inc.</strong> (États-Unis) : envoi des emails (identifiants, codes de
                signature, contrats, réponses aux demandes).
              </li>
            </ul>
            <p>
              Les transferts de données vers les États-Unis sont encadrés par les clauses contractuelles
              types de la Commission européenne, intégrées aux accords de traitement de ces prestataires,
              et, pour ceux qui y ont adhéré, par le cadre de protection des données UE–États-Unis (Data
              Privacy Framework).
            </p>
          </Section>

          <Section title="Durées de conservation">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Demandes de contact et de devis : {R.leadYears} ans après la demande, puis supprimées
                automatiquement.
              </li>
              <li>
                Données client (coordonnées, animaux, visites, photos, accès à l&apos;espace client) : pendant
                la relation, puis {R.clientInactiveYears} ans après la dernière prestation. Elles sont ensuite
                effacées automatiquement ; seules restent les mentions obligatoires des factures.
              </li>
              <li>
                Contrat signé et preuve de signature : {R.signedContractYears} ans après la dernière
                prestation (délai de prescription), puis supprimés automatiquement. Un lien de signature non
                utilisé est supprimé {R.unsignedContractDays} jours après son expiration.
              </li>
              <li>
                Factures et pièces comptables : 10 ans, comme l&apos;impose la loi, y compris après une
                demande d&apos;effacement.
              </li>
              <li>Empreintes d&apos;adresses IP (sécurité) : {R.rateLimitDays} jours.</li>
            </ul>
          </Section>

          <Section title="Sécurité">
            <p>
              Le site n&apos;est accessible qu&apos;en connexion chiffrée (HTTPS). Les mots de passe sont
              stockés sous forme chiffrée irréversible, les tentatives de connexion répétées sont bloquées,
              l&apos;accès administrateur peut être protégé par une double authentification et chaque
              déconnexion ferme la session sur tous les appareils. Les photos sont stockées dans un espace
              privé : elles ne sont visibles que par vous et par la prestataire, jamais par un lien public.
            </p>
            <p>
              En cas de violation de données présentant un risque pour vous, la CNIL et les personnes
              concernées sont informées dans les délais prévus par le RGPD.
            </p>
          </Section>

          <Section title="Cookies">
            <p>Ce site n&apos;utilise que des cookies nécessaires à son fonctionnement :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>petsitter_session</strong> : maintient votre connexion à votre espace (30 jours au
                plus).
              </li>
              <li>
                <strong>petsitter_mfa</strong> : étape de vérification du code lors de la connexion
                administrateur (5 minutes).
              </li>
              <li>
                <strong>theme</strong> : mémorise l&apos;affichage clair ou sombre si vous le choisissez (1 an).
              </li>
            </ul>
            <p>
              Aucun cookie de mesure d&apos;audience, de publicité ou de réseau social n&apos;est utilisé.
              Ces cookies étant strictement nécessaires ou demandés par vous, aucun consentement n&apos;est
              requis (article 82 de la loi Informatique et Libertés).
            </p>
          </Section>

          <Section title="Vos droits">
            <p>Vous disposez à tout moment des droits suivants sur vos données :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>droit d&apos;accès et de rectification ;</li>
              <li>
                droit à l&apos;effacement : vos données sont supprimées, à l&apos;exception des factures que la
                loi impose de conserver ;
              </li>
              <li>droit à la limitation du traitement et droit d&apos;opposition ;</li>
              <li>
                droit à la portabilité : le bouton « Télécharger mes données » de votre espace client fournit
                l&apos;ensemble de vos données dans un fichier structuré ;
              </li>
              <li>
                droit de définir des directives sur le sort de vos données après votre décès (article 85 de
                la loi Informatique et Libertés).
              </li>
            </ul>
            <p>
              Pour exercer ces droits, écrivez à <Contact email={s.contact_email} />. Une réponse vous est
              apportée dans un délai d&apos;un mois. Vous pouvez aussi introduire une réclamation auprès de la
              CNIL (
              <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer" className="text-rouille underline">
                cnil.fr/plaintes
              </a>
              ).
            </p>
          </Section>
        </div>

        <p className="text-sm text-pierre">
          Voir aussi les{" "}
          <Link href="/mentions-legales" className="text-rouille underline">
            mentions légales
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
