import "./globals.css";

export const metadata = {
  title: "Aux Bonnes Pattes — Suivi pet sitting",
  description: "Gestion des visites, clients et comptabilité pour votre activité de pet sitting.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#2e4235",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full flex flex-col bg-sand text-ink font-body antialiased">
        {children}
      </body>
    </html>
  );
}
