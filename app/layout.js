import { cookies } from "next/headers";
import "./globals.css";

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
    { media: "(prefers-color-scheme: light)", color: "#2e4235" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1310" },
  ],
};

export default async function RootLayout({ children }) {
  // Thème choisi dans Réglages ("light" / "dark"), sinon on suit le système.
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value;
  const dataTheme = theme === "light" || theme === "dark" ? theme : undefined;

  return (
    <html lang="fr" className="h-full" data-theme={dataTheme}>
      <body className="min-h-full flex flex-col bg-sand text-ink font-body antialiased">
        {children}
      </body>
    </html>
  );
}
