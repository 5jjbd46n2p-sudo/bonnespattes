import { NextResponse } from "next/server";

// Première barrière, exécutée avant tout rendu (Next.js 16 : "proxy" remplace
// "middleware"). Volontairement sans dépendance (pas de bibliothèque JWT) pour
// fonctionner quel que soit l'environnement d'exécution choisi par l'hébergeur.
// La vérification complète de la session (signature, révocation, rôle) est
// faite par chaque page (adminPageGuard / clientPageGuard) et chaque route.

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const PRIVATE_PREFIXES = ["/admin", "/portal", "/compte", "/contrat", "/api", "/login"];

// Hôtes sous lesquels le site est servi. Derrière Vercel, l'en-tête Host peut
// différer du domaine public : on retient aussi X-Forwarded-Host (comme le fait
// Next.js pour ses propres protections) et l'URL publique configurée.
function siteHosts(request) {
  const hosts = new Set();
  for (const h of [request.headers.get("x-forwarded-host"), request.headers.get("host")]) {
    if (h) hosts.add(h.split(",")[0].trim().toLowerCase());
  }
  try {
    if (process.env.NEXT_PUBLIC_APP_URL) hosts.add(new URL(process.env.NEXT_PUBLIC_APP_URL).host.toLowerCase());
  } catch {
    // URL publique mal renseignée : ignorée
  }
  return hosts;
}

// Protection CSRF : une requête d'écriture doit venir de ce site.
// 1. Sec-Fetch-Site est posé par le navigateur lui-même (impossible à falsifier
//    depuis un autre site) : seules "same-origin" et "none" sont acceptées.
// 2. Navigateurs plus anciens : l'en-tête Origin doit correspondre au site.
function isCrossSite(request) {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site !== "same-origin" && site !== "none";
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return !siteHosts(request).has(new URL(origin).host.toLowerCase());
  } catch {
    return true;
  }
}

export function proxy(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/") && MUTATING.has(request.method) && isCrossSite(request)) {
    return NextResponse.json({ error: "Requête refusée." }, { status: 403 });
  }

  // Espaces privés : sans cookie de session, inutile d'aller plus loin.
  const isPrivateArea =
    pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/portal" || pathname.startsWith("/portal/");
  if (isPrivateArea && !request.cookies.get("petsitter_session")?.value) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.next();
  // Pages et API privées : jamais indexées par les moteurs de recherche.
  if (PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return response;
}

export const config = {
  matcher: [
    // Tout sauf les fichiers statiques de Next et les icônes
    "/((?!_next/static|_next/image|icon.svg|apple-icon.png|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
