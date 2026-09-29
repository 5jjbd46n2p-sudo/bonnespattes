import { requireClient } from "@/lib/auth";
import { buildClientExport } from "@/lib/clientExport";

// Droit à la portabilité des données (article 20 RGPD) : permet à un client
// de télécharger lui-même l'ensemble des données le concernant, dans un
// format structuré et lisible par machine (JSON).
export async function GET() {
  const user = await requireClient();
  if (!user) return new Response(JSON.stringify({ error: "Non autorisé." }), { status: 401 });
  const data = await buildClientExport(user.client_id);
  if (!data) return new Response(JSON.stringify({ error: "Client introuvable." }), { status: 404 });
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mes-donnees.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
