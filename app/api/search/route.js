import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// Recherche globale de l'espace admin : clients (nom, adresse, téléphone,
// email) et animaux (nom). Réservée à l'administrateur.
export async function GET(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ clients: [], pets: [] });

  // Les caractères spéciaux de LIKE (% _ \) saisis par l'utilisateur sont
  // échappés pour être cherchés tels quels.
  const like = `%${q.replace(/[\\%_]/g, (m) => "\\" + m)}%`;

  try {
    const [clientsRes, petsRes] = await Promise.all([
      query(
        `SELECT id, first_name, last_name, address, phone
         FROM clients
         WHERE anonymized_at IS NULL AND (first_name ILIKE $1 OR last_name ILIKE $1
            OR (first_name || ' ' || last_name) ILIKE $1
            OR (last_name || ' ' || first_name) ILIKE $1
            OR address ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1)
         ORDER BY last_name, first_name
         LIMIT 8`,
        [like]
      ),
      query(
        `SELECT p.id, p.name, p.species, p.client_id, c.first_name, c.last_name
         FROM pets p JOIN clients c ON c.id = p.client_id
         WHERE p.name ILIKE $1 OR p.breed ILIKE $1
         ORDER BY p.name
         LIMIT 8`,
        [like]
      ),
    ]);
    return NextResponse.json({ clients: clientsRes.rows, pets: petsRes.rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur, réessaie plus tard." }, { status: 500 });
  }
}
