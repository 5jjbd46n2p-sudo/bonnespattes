"use client"; // Les limites d'erreur sont des composants client (Next 16)

// Erreur dans la mise en page racine elle-même : ce fichier remplace tout le
// document. Les styles globaux ne sont pas chargés ici, d'où des styles en
// ligne reprenant les couleurs « carnet de balade » (papier, encre, rouille).
const C = { papier: "#F7F2EA", encre: "#1F1A15", pierre: "#6E655A", rouille: "#A8481F", trait: "#E3D9C9" };

export default function GlobalError({ error, retry }) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: C.papier,
          color: C.encre,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          fontSize: 16,
          lineHeight: 1.5,
        }}
      >
        <title>Aux Bonnes Pattes</title>
        <main style={{ maxWidth: 560, margin: "0 auto", padding: "48px 16px" }}>
          <p style={{ fontFamily: "Georgia, serif", fontWeight: 600, fontSize: 20, margin: "0 0 24px" }}>Aux Bonnes Pattes</p>
          <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 600, fontSize: 28, lineHeight: 1.15, margin: "0 0 24px" }}>
            Cette page n&apos;a pas pu s&apos;afficher.
          </h1>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => retry?.()}
              style={{
                minHeight: 44,
                padding: "10px 18px",
                borderRadius: 8,
                border: "none",
                background: C.rouille,
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              Réessayer
            </button>
            <a
              href="/"
              style={{
                minHeight: 44,
                boxSizing: "border-box",
                display: "inline-flex",
                alignItems: "center",
                padding: "10px 16px",
                borderRadius: 8,
                border: `1px solid ${C.trait}`,
                color: C.encre,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Retour à l&apos;accueil
            </a>
          </div>
          {error?.digest ? (
            <p style={{ fontSize: 13, color: C.pierre, marginTop: 24 }}>Référence : {error.digest}</p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
