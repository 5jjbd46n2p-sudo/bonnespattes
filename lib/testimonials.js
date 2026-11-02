import { query } from "@/lib/db";

// Avis publiés, affichés sur la page d'accueil (liste vide si la table n'existe pas encore).
export async function loadPublishedTestimonials(limit = 6) {
  try {
    const { rows } = await query(
      "SELECT id, author, detail, body FROM testimonials WHERE published ORDER BY created_at DESC LIMIT $1",
      [limit]
    );
    return rows;
  } catch {
    return [];
  }
}
