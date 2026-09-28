// Source unique des couleurs de statut : badges, pastilles du calendrier et
// liseré des cartes de visite utilisent tous ces mêmes réglages, pour qu'un
// statut ait exactement la même couleur partout dans l'application.
export const VISIT_STATUS = {
  PLANIFIE: {
    label: "Planifiée",
    badge: "bg-amber-100 text-amber-800",
    dot: "bg-amber-500",
    border: "border-l-amber-400",
  },
  EN_COURS: {
    label: "En cours",
    badge: "bg-blue-100 text-blue-800",
    dot: "bg-blue-500",
    border: "border-l-blue-400",
  },
  FAIT: {
    label: "Terminée",
    badge: "bg-emerald-100 text-emerald-800",
    dot: "bg-emerald-500",
    border: "border-l-emerald-400",
  },
  ANNULE: {
    label: "Annulée",
    badge: "bg-stone-200 text-stone-600",
    dot: "bg-stone-400",
    border: "border-l-stone-300",
  },
};
export const VISIT_STATUS_ORDER = ["PLANIFIE", "EN_COURS", "FAIT", "ANNULE"];

const INVOICE_STYLES = {
  BROUILLON: "bg-stone-200 text-stone-700",
  ENVOYEE: "bg-blue-100 text-blue-800",
  PAYEE: "bg-emerald-100 text-emerald-800",
  EN_RETARD: "bg-red-100 text-red-800",
};
const INVOICE_LABELS = {
  BROUILLON: "Brouillon",
  ENVOYEE: "Envoyée",
  PAYEE: "Payée",
  EN_RETARD: "En retard",
};

export function VisitStatusBadge({ status }) {
  const meta = VISIT_STATUS[status];
  return (
    <span className={`badge ${meta?.badge || "bg-stone-100 text-stone-700"}`}>
      {meta && <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />}
      {meta?.label || status}
    </span>
  );
}

export function InvoiceStatusBadge({ status }) {
  return (
    <span className={`badge ${INVOICE_STYLES[status] || "bg-stone-100 text-stone-700"}`}>
      {INVOICE_LABELS[status] || status}
    </span>
  );
}
