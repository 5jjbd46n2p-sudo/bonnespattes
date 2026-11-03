import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import Logo from "@/components/Logo";
import Photo from "@/components/landing/Photo";
import { loadPublishedTestimonials } from "@/lib/testimonials";
import { loadSitePhotos, sitePhotoSrc, SITE_PHOTO_SLOTS } from "@/lib/sitePhotos";
import Gallery from "@/components/landing/Gallery";
import LeadForm from "@/components/landing/LeadForm";
import VisitTimeline from "@/components/landing/VisitTimeline";
import TrustList from "@/components/landing/TrustList";
import PriceTable from "@/components/landing/PriceTable";
import Testimonials from "@/components/landing/Testimonials";
import SiteFooter from "@/components/landing/SiteFooter";
import StickyContactBar from "@/components/landing/StickyContactBar";

export const dynamic = "force-dynamic";

const TITLE = "Aux Bonnes Pattes — Visites et balades pour vos animaux, à Viarmes et autour";
const DESCRIPTION =
  "Aurore, ancienne assistante vétérinaire, passe chez vous pour vos chiens, vos chats et vos NAC : visites à domicile et balades à Viarmes (95) et environ 15 km autour. Un compte rendu avec photos après chaque passage.";

export const metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Aux Bonnes Pattes",
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    images: [{ url: "/api/site-photos/hero", alt: "Aux Bonnes Pattes, pet sitting à Viarmes" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

async function loadSettings() {
  try {
    const { rows } = await query("SELECT * FROM settings LIMIT 1");
    return rows[0] || {};
  } catch {
    return {};
  }
}

async function loadReferrer(code) {
  const clean = String(code || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(clean)) return { code: "", name: "" };
  try {
    const { rows } = await query("SELECT first_name FROM clients WHERE upper(referral_code) = $1 LIMIT 1", [clean]);
    if (rows[0]) return { code: clean, name: rows[0].first_name || "" };
  } catch {
    // colonne pas encore migrée : on ignore
  }
  return { code: clean, name: "" };
}

function jsonLd(area, appUrl) {
  const data = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Aux Bonnes Pattes",
    description: DESCRIPTION,
    ...(appUrl ? { url: appUrl } : {}),
    address: { "@type": "PostalAddress", postalCode: "95270", addressLocality: "Viarmes", addressCountry: "FR" },
    areaServed: area,
    serviceType: ["Visite à domicile pour chiens et chats", "Promenade de chiens"],
    sameAs: ["https://www.instagram.com/auxbonnespattes/"],
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rouille";

export default async function Home({ searchParams }) {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/portal");

  const sp = await searchParams;
  const rawCode = Array.isArray(sp?.parrain) ? sp.parrain[0] : sp?.parrain;
  const [s, referrer, photoVersions, testimonials] = await Promise.all([
    loadSettings(),
    loadReferrer(rawCode),
    loadSitePhotos(),
    loadPublishedTestimonials(),
  ]);
  const galleryPhotos = SITE_PHOTO_SLOTS.filter((x) => x.slot.startsWith("gallery-") && photoVersions[x.slot]).map((x) => ({
    src: sitePhotoSrc(x.slot, photoVersions[x.slot]),
    alt: x.alt,
  }));
  const area = s.service_area || "Viarmes et environs (15 km, au-delà sur devis)";
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const insured = Boolean(String(s?.insurance_info || "").trim());

  return (
    <div className="bg-papier text-encre">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(area, appUrl) }} />

      <a
        href="#contact"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:px-3 focus:py-2 focus:bg-lin focus:rounded-lg focus:outline-2 focus:outline-rouille"
      >
        Aller au formulaire de contact
      </a>

      <header className="px-4 py-4 border-b border-trait">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <Link href="/" aria-label="Aux Bonnes Pattes, accueil" className={`rounded ${FOCUS}`}>
            <Logo size={26} className="text-encre" />
          </Link>
          <Link
            href="/login"
            className={`text-sm font-bold text-encre underline underline-offset-4 decoration-trait hover:decoration-rouille py-2 rounded ${FOCUS}`}
          >
            Espace client
          </Link>
        </div>
      </header>

      <main>
        {/* Ouverture : une seule action principale */}
        <section className="px-4 pt-10 pb-8 md:pt-20 md:pb-12">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-display text-[32px] md:text-5xl font-semibold leading-tight text-balance">
              Visites et balades pour vos animaux, à Viarmes et autour.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-pierre max-w-2xl">
              Aurore, ancienne assistante vétérinaire. Un compte rendu avec photos après chaque passage.
            </p>
            <a href="#contact" className={`btn-primary text-base mt-7 w-full sm:w-auto ${FOCUS}`}>
              Demander un rendez-vous
            </a>
          </div>
        </section>

        {photoVersions.hero && (
          <figure className="px-4 md:max-w-5xl md:mx-auto">
            <Photo
              src={sitePhotoSrc("hero", photoVersions.hero)}
              alt="Aurore, pet sitter à Viarmes, avec un chien en balade"
              eager
              className="aspect-[4/3] md:aspect-[16/9] w-full"
            />
            <figcaption className="mt-2 text-[13px] text-pierre">En balade autour de Viarmes.</figcaption>
          </figure>
        )}

        <VisitTimeline />

        {/* À propos */}
        <section aria-labelledby="a-propos" className="px-4 py-12 md:py-16 bg-lin border-y border-trait">
          <div className="max-w-3xl mx-auto grid md:grid-cols-[1fr_16rem] gap-8 items-start">
            <div>
              <h2 id="a-propos" className="font-display text-2xl md:text-3xl font-semibold">
                À propos
              </h2>
              <p className="mt-4 leading-relaxed">
                J'ai été assistante vétérinaire diplômée, trois ans en clinique. Aujourd'hui, je viens chez vous
                m'occuper de vos chiens, de vos chats et de vos NAC pendant votre absence. Vos animaux gardent leurs
                repères, et vous recevez de leurs nouvelles après chaque passage.
              </p>
              <blockquote className="mt-6 border-l-2 border-rouille pl-4">
                <p className="font-display text-xl font-semibold text-rouille leading-snug">
                  « Je repère ce qui ne va pas et je vous préviens vite. »
                </p>
                <footer className="mt-2 text-sm text-pierre">Aurore</footer>
              </blockquote>
              <p className="mt-4 text-pierre leading-relaxed">
                Je ne pose pas de diagnostic, votre vétérinaire reste votre vétérinaire.
              </p>
            </div>
            {photoVersions.confiance && (
              <Photo
                src={sitePhotoSrc("confiance", photoVersions.confiance)}
                alt="Aurore, ancienne assistante vétérinaire, avec un animal"
                className="aspect-[4/5] w-full max-w-xs"
              />
            )}
          </div>
        </section>

        <TrustList insured={insured} />

        <Testimonials items={testimonials} />

        <PriceTable settings={s} area={area} />

        <Gallery photos={galleryPhotos} />

        {/* Formulaire de demande (en bas : le bouton d'ouverture et la barre mobile y mènent) */}
        <section id="contact" aria-labelledby="contact-titre" className="px-4 py-12 md:py-16 border-t border-trait scroll-mt-4">
          <div className="max-w-2xl mx-auto">
            <h2 id="contact-titre" className="font-display text-2xl md:text-3xl font-semibold">
              Demander un rendez-vous
            </h2>
            <p className="text-pierre mt-2 mb-6 leading-relaxed">
              Parlez-moi de vous et de vos compagnons. Je vous réponds sous 24 h. La première rencontre est gratuite.
            </p>
            <LeadForm initialCode={referrer.code} referrerName={referrer.name} />
          </div>
        </section>
      </main>

      <SiteFooter area={area} email={s.contact_email} whatsapp={s.whatsapp_number} />
      <StickyContactBar />
    </div>
  );
}
