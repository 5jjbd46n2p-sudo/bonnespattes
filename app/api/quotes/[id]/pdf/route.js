import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isUuid } from "@/lib/api";
import { buildQuotePdf } from "@/lib/quoteDoc";

export async function GET(_req, { params }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Non autorisé.", { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return new Response("Devis introuvable.", { status: 404 });
  const q = (await query("SELECT * FROM quotes WHERE id = $1", [id])).rows[0];
  if (!q || (user.role === "CLIENT" && q.client_id !== user.client_id)) return new Response("Devis introuvable.", { status: 404 });
  const [items, client, settings] = await Promise.all([
    query("SELECT * FROM quote_items WHERE quote_id = $1 ORDER BY position", [id]),
    query("SELECT * FROM clients WHERE id = $1", [q.client_id]),
    query("SELECT * FROM settings LIMIT 1"),
  ]);
  const bytes = await buildQuotePdf({ quote: q, items: items.rows, client: client.rows[0], settings: settings.rows[0] });
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${String(q.number).replace(/[^A-Za-z0-9_-]/g, "")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
