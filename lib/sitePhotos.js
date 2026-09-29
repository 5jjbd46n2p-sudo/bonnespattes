import { query } from "@/lib/db";

// Emplacements de photos de la page d'accueil, gérés depuis l'admin.
export const SITE_PHOTO_SLOTS = [
  { slot: "hero", label: "Photo principale (en haut de la page)", alt: "Aurore, pet sitter à Viarmes, avec un animal" },
  { slot: "services", label: "Sous « Ce que je fais » (carré)", alt: "Aurore avec un animal pendant une visite ou une promenade" },
  { slot: "confiance", label: "À côté de « Pourquoi me faire confiance » (grand carré)", alt: "Aurore, ancienne assistante vétérinaire, avec un animal" },
  ...[1, 2, 3, 4, 5, 6].map((n) => ({ slot: `gallery-${n}`, label: `Galerie, photo ${n}`, alt: "Un instant de balade ou de visite" })),
];

export const isSiteSlot = (s) => SITE_PHOTO_SLOTS.some((x) => x.slot === s);

// { slot: updated_at_ms } ; vide si la table n'existe pas encore.
export async function loadSitePhotos() {
  try {
    const { rows } = await query("SELECT slot, updated_at FROM site_photos");
    return Object.fromEntries(rows.map((r) => [r.slot, new Date(r.updated_at).getTime()]));
  } catch {
    return {};
  }
}

export const sitePhotoSrc = (slot, v) => `/api/site-photos/${slot}?v=${v}`;
