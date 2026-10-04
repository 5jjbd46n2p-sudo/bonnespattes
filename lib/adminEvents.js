// Types de rendez-vous ou tâches administratives du planning.
export const ADMIN_EVENT_KINDS = [
  { id: "RENCONTRE", label: "Rencontre client" },
  { id: "DEVIS", label: "Devis / estimation" },
  { id: "FACTURATION", label: "Facturation / administratif" },
  { id: "COURSES", label: "Courses / matériel" },
  { id: "AUTRE", label: "Autre" },
];

export const ADMIN_EVENT_KIND_IDS = ADMIN_EVENT_KINDS.map((k) => k.id);

export function adminKindLabel(id) {
  return ADMIN_EVENT_KINDS.find((k) => k.id === id)?.label || "Autre";
}

// Couleur de chaque type dans le planning (pastilles du calendrier et barre latérale des lignes).
export const VISIT_COLOR = "var(--color-rouille)";
export const ADMIN_EVENT_COLORS = {
  RENCONTRE: "var(--color-miel)",
  DEVIS: "var(--color-mousse)",
  FACTURATION: "var(--color-pierre)",
  COURSES: "#4a6fa5",
  AUTRE: "var(--color-trait)",
};
export function adminKindColor(id) {
  return ADMIN_EVENT_COLORS[id] || ADMIN_EVENT_COLORS.AUTRE;
}
