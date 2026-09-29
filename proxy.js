import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

// Première barrière, exécutée avant tout rendu (Next.js 16 : "proxy" remplace
// "middleware"). Les pages et routes refont leurs propres vérifications
// complètes (session révoquée, propriétaire des données…) : ceci n'est qu'un
// filet de sécurité supplémentaire, jamais la seule protection.

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const PRIVATE_PREFIXES = ["/admin", "/portal", "/compte", "/contrat", "/api", "/login"];

function sessionRole(request) {
  const token = request.cookies.get("petsitter_session")?.value;
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return null;
  try {
    return jwt.verify(token, secret, { audience: "session" }).role || null;
  } catch {
    return null;
  }
}

// Protection CSRF : une requête d'écriture doit venir de ce site. Les
// navigateurs envoient toujours l'en-tête Origin (ou Sec-Fetch-Site) sur ces
// requêtes ; un site tiers ne peut pas les falsifier.
function isCrossSite(request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host !== request.headers.get("host");
    } catch {
      return true;
    }
  }
  const site = request.headers.get("sec-fetch-site");
  return site === "cross-site" || site === "same-site";
}

export function proxy(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/") && MUTATING.has(request.method) && isCrossSite(request)) {
    return NextResponse.json({ error: "Requête refusée." }, { status: 403 });
  }

  const needsAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const needsClient = pathname === "/portal" || pathname.startsWith("/portal/");
  if (needsAdmin || needsClient) {
    const role = sessionRole(request);
    if (role !== (needsAdmin ? "ADMIN" : "CLIENT")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
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
