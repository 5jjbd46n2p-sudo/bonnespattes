const VISIT_STYLES = {
  PLANIFIE: "bg-amber-100 text-amber-800",
  EN_COURS: "bg-blue-100 text-blue-800",
  FAIT: "bg-emerald-100 text-emerald-800",
  ANNULE: "bg-stone-200 text-stone-600",
};
const VISIT_LABELS = { PLANIFIE: "Planifiée", EN_COURS: "En cours", FAIT: "Terminée", ANNULE: "Annulée" };

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
  return (
    <span className={`badge ${VISIT_STYLES[status] || "bg-stone-100 text-stone-700"}`}>
      {VISIT_LABELS[status] || status}
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
