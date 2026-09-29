// Statut de visite unifié, calculé (jamais stocké).
export const BILLING_LABELS = {
  A_FAIRE: "À faire",
  TERMINEE: "Terminée",
  FACTUREE: "Facturée",
  PAYEE: "Payée",
  OFFERTE: "Offerte",
  ANNULEE: "Annulée",
};

export function billingState(visit, invoice) {
  if (!visit) return "A_FAIRE";
  if (visit.status === "ANNULE") return "ANNULEE";
  if (visit.is_free) return "OFFERTE";
  if (visit.invoice_id || invoice) {
    if (invoice && invoice.status === "PAYEE") return "PAYEE";
    return "FACTUREE";
  }
  if (visit.status === "FAIT") return "TERMINEE";
  return "A_FAIRE";
}
