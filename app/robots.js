// robots.txt : seule la vitrine publique est proposée aux moteurs de recherche.
export default function robots() {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        // Les photos de la vitrine passent par /api/site-photos : elles restent explorables.
        allow: ["/", "/api/site-photos/"],
        disallow: ["/admin", "/portal", "/compte", "/contrat", "/api/", "/login"],
      },
    ],
    ...(base ? { sitemap: `${base}/sitemap.xml`, host: base } : {}),
  };
}
