/** @type {import('next').NextConfig} */
const nextConfig = {
  // N'annonce pas la techno utilisée (réduction mineure de la surface
  // d'information exposée aux attaquants).
  poweredByHeader: false,

  async headers() {
    // En-têtes de sécurité appliqués à toutes les routes. Le service ne charge
    // aucun script tiers ni traceur : la CSP reste donc volontairement stricte
    // sur les origines externes tout en gardant 'unsafe-inline' pour le script
    // de démarrage React/Next lui-même (nécessaire au fonctionnement du site).
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https:",
          "font-src 'self' data:",
          "connect-src 'self'",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "object-src 'none'",
        ].join("; "),
      },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
