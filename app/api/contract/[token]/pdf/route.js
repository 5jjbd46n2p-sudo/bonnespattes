import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashToken, buildContractPdf, pdfResponse } from "@/lib/contract";

export async function GET(_req, { params }) {
  const { token } = await params;
  if (!token || typeof token !== "string" || token.length > 200) {
    return NextResponse.json({ error: "Lien invalide." }, { status: 404 });
  }
  const { rows } = await query(
    "SELECT * FROM contract_signatures WHERE token_hash = $1 AND status = 'SIGNE'",
    [hashToken(token)]
  );
  const sig = rows[0];
  if (!sig) return NextResponse.json({ error: "Contrat introuvable ou non signé." }, { status: 404 });
  const clientRes = await query("SELECT * FROM clients WHERE id = $1", [sig.client_id]);
  const bytes = await buildContractPdf(sig, clientRes.rows[0]);
  return pdfResponse(bytes, `contrat-signe-v${sig.version}.pdf`);
}
