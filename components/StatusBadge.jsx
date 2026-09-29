// Source unique des couleurs de statut : badges, pastilles du calendrier et
// cartes de visite utilisent tous ces mêmes réglages, pour qu'un statut ait
// exactement la même couleur partout dans l'application.
// Couleurs (docs/IDENTITE_VISUELLE.md) : Planifiée = miel · En cours = rouille
// · Terminée = mousse · Annulée = pierre.
// - badge  : couleur du texte du badge (le miel, trop clair pour du texte,
//            n'est utilisé que pour la pastille ; le texte reste en encre)
// - dot    : couleur de la pastille ronde
// - border : liseré éventuel
export const VISIT_STATUS = {
  PLANIFIE: {
    label: "Planifiée",
    badge: "text-encre",
    dot: "bg-miel",
    border: "border-l-miel",
  },
  EN_COURS: {
    label: "En cours",
    badge: "text-rouille",
    dot: "bg-rouille",
    border: "border-l-rouille",
  },
  FAIT: {
    label: "Terminée",
    badge: "text-mousse",
    dot: "bg-mousse",
    border: "border-l-mousse",
  },
  ANNULE: {
    label: "Annulée",
    badge: "text-pierre",
    dot: "bg-pierre",
    border: "border-l-pierre",
  },
};
export const VISIT_STATUS_ORDER = ["PLANIFIE", "EN_COURS", "FAIT", "ANNULE"];

const INVOICE_STATUS = {
  BROUILLON: { label: "Brouillon", badge: "text-pierre", dot: "bg-pierre" },
  ENVOYEE: { label: "Envoyée", badge: "text-encre", dot: "bg-miel" },
  PAYEE: { label: "Payée", badge: "text-mousse", dot: "bg-mousse" },
  EN_RETARD: { label: "En retard", badge: "text-brique", dot: "bg-brique" },
};

const FALLBACK = { badge: "text-pierre", dot: "bg-pierre" };

// Badge : pastille ronde de 8px suivie du texte (13px, gras), sans fond.
function Badge({ meta, label }) {
  return (
    <span className={`badge ${meta.badge}`}>
      <span className={`badge-dot ${meta.dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

export function VisitStatusBadge({ status }) {
  const meta = VISIT_STATUS[status];
  return <Badge meta={meta || FALLBACK} label={meta?.label || status} />;
}

export function InvoiceStatusBadge({ status }) {
  const meta = INVOICE_STATUS[status];
  return <Badge meta={meta || FALLBACK} label={meta?.label || status} />;
}
