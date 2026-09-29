import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { formatEUR } from "@/lib/utils";
import Logo from "@/components/Logo";
import Photo from "@/components/landing/Photo";
import { loadSitePhotos, sitePhotoSrc, SITE_PHOTO_SLOTS } from "@/lib/sitePhotos";
import Gallery from "@/components/landing/Gallery";
import LeadForm from "@/components/landing/LeadForm";
import {
  Camera,
  Dog,
  FileText,
  House,
  InstagramLogo,
  MapPin,
  ShieldCheck,
  Stethoscope,
} from "@phosphor-icons/react/ssr";

export const dynamic = "force-dynamic";

const TITLE = "Aux Bonnes Pattes — Visites à domicile et promenades pour chiens et chats à Viarmes";
const DESCRIPTION =
  "Aurore, ancienne assistante vétérinaire, s'occupe de vos chiens et de vos chats : visites à domicile et promenades à Viarmes (95) et dans un rayon d'environ 15 km (au-delà sur devis). Compte rendu et photos après chaque passage.";

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
  const [s, referrer, photoVersions] = await Promise.all([loadSettings(), loadReferrer(rawCode), loadSitePhotos()]);
  const galleryPhotos = SITE_PHOTO_SLOTS.filter((x) => x.slot.startsWith("gallery-") && photoVersions[x.slot]).map((x) => ({ src: sitePhotoSrc(x.slot, photoVersions[x.slot]), alt: x.alt }));
  const area = s.service_area || "Viarmes et environs (15 km, au-delà sur devis)";
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");

  const rates = [
    { label: "Visite de 30 minutes", price: s.rate_30 ?? 15 },
    { label: "Visite de 45 minutes", price: s.rate_45 ?? 18 },
    { label: "Visite ou balade d'une heure", price: s.rate_60 ?? 22 },
  ];

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
          <Link href="/" aria-label="Aux Bonnes Pattes, accueil">
            <Logo size={26} className="text-encre" />
          </Link>
          <Link href="/login" className="text-sm font-bold text-encre underline underline-offset-4 decoration-trait hover:decoration-rouille py-2">
            Espace client
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="px-4 py-10 md:py-20">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <p className="label mb-3 flex items-center gap-1.5">
                <MapPin size={16} aria-hidden="true" />
                {area}
              </p>
              <h1 className="font-display text-[32px] md:text-5xl font-semibold leading-tight">
                Vos compagnons entre de bonnes mains, en votre absence.
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-pierre">
                Je m'appelle Aurore. Ancienne assistante vétérinaire, je viens chez vous nourrir, câliner et
                promener vos chiens et vos chats, et je vous donne des nouvelles après chaque passage.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <a href="#contact" className="btn-primary text-base">
                  Demander un rendez-vous
                </a>
                <a href="#tarifs" className="btn-ghost text-base">
                  Voir les tarifs
                </a>
              </div>
            </div>
            <Photo
              src={photoVersions.hero ? sitePhotoSrc("hero", photoVersions.hero) : null}
              alt="Aurore, pet sitter à Viarmes, avec un animal"
              eager
              className="aspect-[4/3] md:aspect-[4/5]"
            />
          </div>
        </section>

        {/* Ce que je fais */}
        <section aria-labelledby="services" className="px-4 py-12 md:py-16 border-t border-trait">
          <div className="max-w-5xl mx-auto grid md:grid-cols-[1fr_2fr] gap-6 md:gap-12">
            <h2 id="services" className="font-display text-2xl md:text-3xl font-semibold">
              Ce que je fais
            </h2>
            <div className="space-y-6">
            <ul className="divide-y divide-trait border-y border-trait">
              <Line icon={House} title="Visites à domicile">
                Repas, eau fraîche, litière, câlins, jeu et un coup d'oeil à la maison. Vos animaux restent dans
                leurs repères, sans stress de déplacement.
              </Line>
              <Line icon={Dog} title="Promenades">
                Une vraie balade, adaptée à l'âge et à l'énergie de votre chien, en laisse et en sécurité.
              </Line>
              <Line icon={Stethoscope} title="Chiens, chats et autres compagnons">
                Habituée aux animaux de toutes sortes, je m'adapte au caractère et aux habitudes de chacun.
              </Line>
            </ul>
            <Photo
              src={photoVersions.services ? sitePhotoSrc("services", photoVersions.services) : null}
              alt="Aurore avec un animal pendant une visite ou une promenade"
              className="aspect-square w-full max-w-xs"
            />
            </div>
          </div>
        </section>

        {/* Confiance */}
        <section aria-labelledby="confiance" className="px-4 py-12 md:py-16 bg-sable">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6 md:gap-12 items-start">
            <Photo
              src={photoVersions.confiance ? sitePhotoSrc("confiance", photoVersions.confiance) : null}
              alt="Aurore, ancienne assistante vétérinaire, avec un animal"
              className="aspect-square w-full"
            />
            <div>
            <h2 id="confiance" className="font-display text-xl md:text-2xl font-semibold mb-4">
              Pourquoi me faire confiance
            </h2>
            <ul className="divide-y divide-trait border-y border-trait">
              <Line icon={Stethoscope} title="Un regard attentif">
                J'ai été assistante vétérinaire : je repère ce qui ne va pas et je vous préviens vite. Je ne pose
                pas de diagnostic et je ne remplace pas votre vétérinaire.
              </Line>
              <Line icon={Camera} title="Des nouvelles après chaque visite">
                Un compte rendu et des photos vous attendent dans votre espace client après chaque passage.
              </Line>
              <Line icon={FileText} title="Un contrat clair">
                Les visites, les tarifs et les consignes sont écrits noir sur blanc avant de commencer.
              </Line>
              {String(s?.insurance_info || "").trim() && (
                <Line icon={ShieldCheck} title="Une activité assurée">
                  Je suis couverte en responsabilité civile professionnelle.
                </Line>
              )}
            </ul>
            </div>
          </div>
        </section>

        {/* Tarifs */}
        <section id="tarifs" aria-labelledby="tarifs-titre" className="px-4 py-12 md:py-16 scroll-mt-4">
          <div className="max-w-5xl mx-auto grid md:grid-cols-[1fr_2fr] gap-6 md:gap-12">
            <div>
              <h2 id="tarifs-titre" className="font-display text-2xl md:text-3xl font-semibold">
                Tarifs
              </h2>
              <p className="text-pierre mt-2">À partir de</p>
            </div>
            <div>
              <ul className="divide-y divide-trait border-y border-trait">
                {rates.map((r) => (
                  <li key={r.label} className="flex items-baseline justify-between gap-4 py-3.5">
                    <span>{r.label}</span>
                    <span className="font-bold tabular-nums whitespace-nowrap">{formatEUR(r.price)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-pierre mt-4 leading-relaxed">
                Un frais de déplacement s'ajoute selon la distance depuis Viarmes. Je me déplace sur le secteur
                suivant : {area}. Le tarif exact vous est confirmé avant la première visite.
              </p>
            </div>
          </div>
        </section>

        {/* Déroulé */}
        <section aria-labelledby="deroule" className="px-4 py-12 md:py-16 border-t border-trait">
          <div className="max-w-5xl mx-auto">
            <h2 id="deroule" className="font-display text-2xl md:text-3xl font-semibold mb-8">
              Comment ça se passe
            </h2>
            <ol className="grid md:grid-cols-3 gap-8 md:gap-10">
              <Step n="1" title="Vous faites une demande">
                Remplissez le formulaire ci-dessous. Je vous réponds sous 24 h.
              </Step>
              <Step n="2" title="Nous nous rencontrons">
                Une première rencontre gratuite, chez vous, pour faire connaissance avec vous et vos animaux.
              </Step>
              <Step n="3" title="Les visites commencent">
                Je passe aux dates convenues et je vous laisse un compte rendu avec photos.
              </Step>
            </ol>
          </div>
        </section>

        <Gallery photos={galleryPhotos} />

        {/* Contact */}
        <section id="contact" aria-labelledby="contact-titre" className="px-4 py-12 md:py-16 bg-sable scroll-mt-4">
          <div className="max-w-2xl mx-auto">
            <h2 id="contact-titre" className="font-display text-2xl md:text-3xl font-semibold">
              Demander un rendez-vous
            </h2>
            <p className="text-pierre mt-2 mb-6 leading-relaxed">
              Parlez-moi de vous et de vos compagnons, ou demandez un devis pour une garde plus longue ou régulière. La première rencontre est gratuite et sans engagement.
            </p>
            <LeadForm initialCode={referrer.code} referrerName={referrer.name} />
          </div>
        </section>
      </main>

      <footer className="px-4 py-8 border-t border-trait text-sm text-pierre">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <Logo size={22} className="text-encre" />
            <p>{area}</p>
          </div>
          <nav aria-label="Pied de page" className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a
              href="https://www.instagram.com/auxbonnespattes/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 underline py-1"
            >
              <InstagramLogo size={20} aria-hidden="true" />
              @auxbonnespattes
            </a>
            <Link href="/mentions-legales" className="underline py-1">
              Mentions légales
            </Link>
            <Link href="/confidentialite" className="underline py-1">
              Confidentialité
            </Link>
            <Link href="/login" className="underline py-1">
              Espace client
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Line({ icon: Icon, title, children }) {
  return (
    <li className="flex gap-4 py-5">
      <Icon size={24} className="text-rouille shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <h3 className="font-bold">{title}</h3>
        <p className="text-pierre mt-1 leading-relaxed">{children}</p>
      </div>
    </li>
  );
}

function Step({ n, title, children }) {
  return (
    <li>
      <span className="font-display text-4xl font-semibold text-rouille tabular-nums" aria-hidden="true">
        {n}
      </span>
      <h3 className="font-bold mt-1">{title}</h3>
      <p className="text-pierre mt-1 leading-relaxed">{children}</p>
    </li>
  );
}
