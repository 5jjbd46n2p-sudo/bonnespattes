import { BADGE_RING, BADGE_DETAIL, ICON_RING, ICON_DETAIL, DISC } from "@/lib/logoPaths";

/**
 * Logo « Aux Bonnes Pattes » (docs/IDENTITE_VISUELLE.md, section Logo).
 *
 * - <LogoMark /> : icône, un « A » cerclé avec une petite empreinte. Pour les
 *   petits formats (barres de navigation, favicon) où le texte de l'anneau du
 *   badge serait illisible.
 * - <LogoBadge /> : badge complet (« Aux Bonnes Pattes » dans l'anneau, « A »,
 *   deux empreintes), à partir de 72 px environ. variant="plein" : aplat rouille.
 * - <Logo /> : version horizontale, icône + nom en Fraunces 600. Le texte prend
 *   `currentColor` : sur une barre encre, passer className="text-sur-nav".
 * - <PawMark /> : empreinte seule, décor des emplacements photo vides.
 */

function Svg({ size, className, title, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function LogoMark({ size = 28, className = "", title, variant = "contour" }) {
  return (
    <Svg size={size} className={`shrink-0 ${className}`} title={title}>
      {variant === "plein" ? (
        <>
          <path d={DISC} fill="var(--color-rouille)" />
          <path d={ICON_DETAIL} fill="var(--color-sur-rouille)" />
        </>
      ) : (
        <path d={ICON_RING + ICON_DETAIL} fill="var(--color-rouille)" />
      )}
    </Svg>
  );
}

export function LogoBadge({ size = 96, className = "", title = "Aux Bonnes Pattes", variant = "contour" }) {
  return (
    <Svg size={size} className={`shrink-0 ${className}`} title={title}>
      {variant === "plein" ? (
        <>
          <path d={DISC} fill="var(--color-rouille)" />
          <path d={BADGE_DETAIL} fill="var(--color-sur-rouille)" />
        </>
      ) : (
        <path d={BADGE_RING + BADGE_DETAIL} fill="var(--color-rouille)" />
      )}
    </Svg>
  );
}

export function PawMark({ size = 28, className = "", title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="var(--color-rouille)"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      <ellipse cx="6.2" cy="13.2" rx="2.9" ry="3.8" transform="rotate(-24 6.2 13.2)" />
      <ellipse cx="12" cy="7.2" rx="3.1" ry="4.1" transform="rotate(-8 12 7.2)" />
      <ellipse cx="20" cy="7.2" rx="3.1" ry="4.1" transform="rotate(8 20 7.2)" />
      <ellipse cx="25.8" cy="13.2" rx="2.9" ry="3.8" transform="rotate(24 25.8 13.2)" />
      <path d="M16 14.6c-2.9 0-4.6 2.3-6 4.6-1.3 2.1-3.3 3.2-3.3 5.6 0 2.1 1.7 3.6 3.8 3.6 2 0 3.2-1 5.5-1s3.5 1 5.5 1c2.1 0 3.8-1.5 3.8-3.6 0-2.4-2-3.5-3.3-5.6-1.4-2.3-3.1-4.6-6-4.6z" />
    </svg>
  );
}

export default function Logo({ size = 28, className = "", showText = true }) {
  // L'icône est un peu plus grande que l'ancienne empreinte : son cercle lui donne moins de présence à taille égale.
  const mark = Math.round(size * 1.15);
  if (!showText) return <LogoMark size={mark} className={className} title="Aux Bonnes Pattes" />;
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={mark} />
      <span
        className="font-display font-semibold leading-none whitespace-nowrap"
        style={{ fontSize: Math.round(size * 0.72) }}
      >
        Aux Bonnes Pattes
      </span>
    </span>
  );
}
