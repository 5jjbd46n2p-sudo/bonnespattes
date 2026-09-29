import { cookies } from "next/headers";
import { Fraunces, Atkinson_Hyperlegible_Next } from "next/font/google";
import "./globals.css";

// Polices auto-hébergées par next/font (aucune requête vers Google côté
// visiteur). Exposées en variables CSS, reprises dans app/globals.css.
const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  // Police variable : poids 500/600 utilisés, axes SOFT (fixé à 100 en CSS)
  // et opsz (automatique via font-optical-sizing).
  axes: ["SOFT", "opsz"],
  display: "swap",
  variable: "--font-fraunces",
});

const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-atkinson",
});

export const metadata = {
  title: "Aux Bonnes Pattes — Suivi pet sitting",
  description: "Gestion des visites, clients et comptabilité pour votre activité de pet sitting.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  // Permet d'utiliser toute la hauteur de l'écran sur iPhone (barre d'onglets
  // collée en bas, au-dessus de la barre d'accueil).
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1F1A15" },
    { media: "(prefers-color-scheme: dark)", color: "#0F0D0B" },
  ],
};

export default async function RootLayout({ children }) {
  // Thème choisi dans Réglages ("light" / "dark"), sinon on suit le système.
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value;
  const dataTheme = theme === "light" || theme === "dark" ? theme : undefined;

  return (
    <html
      lang="fr"
      className={`h-full ${fraunces.variable} ${atkinson.variable}`}
      data-theme={dataTheme}
    >
      <body className="min-h-full flex flex-col bg-papier text-encre font-body antialiased">
        {children}
      </body>
    </html>
  );
}
