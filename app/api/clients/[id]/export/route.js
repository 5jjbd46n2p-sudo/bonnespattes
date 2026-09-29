import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { buildClientExport } from "@/lib/clientExport";
import { sendClientDataEmail } from "@/lib/email";
import { isUuid } from "@/lib/api";


// Téléchargement du fichier de données d'un client (à remettre en main propre ou à transmettre).
export async function GET(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  const data = await buildClientExport(id);
  if (!data) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="donnees-client.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}

// Envoi du fichier par email, à l'adresse enregistrée du client uniquement.
export async function POST(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  const c = await query("SELECT first_name, last_name, email FROM clients WHERE id = $1", [id]);
  const client = c.rows[0];
  if (!client) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  if (!client.email) return NextResponse.json({ error: "Ce client n'a pas d'adresse email enregistrée." }, { status: 400 });
  const data = await buildClientExport(id);
  try {
    await sendClientDataEmail({
      to: client.email,
      clientName: `${client.first_name || ""} ${client.last_name || ""}`.trim(),
      jsonBase64: Buffer.from(JSON.stringify(data, null, 2), "utf8").toString("base64"),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Envoi impossible, réessaie plus tard." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, sentTo: client.email });
}
