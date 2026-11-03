import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashToken, buildContractPdf, pdfResponse, SIGNED_PDF_LINK_DAYS } from "@/lib/contract";
import { SIGNED_AT_UTC_SQL } from "@/lib/contractSeal";
import { checkContractIntegrity } from "@/lib/contractFinalize";

export async function GET(_req, { params }) {
  const { token } = await params;
  if (!token || typeof token !== "string" || token.length > 200) {
    return NextResponse.json({ error: "Lien invalide." }, { status: 404 });
  }
  const { rows } = await query(
    `SELECT *, ${SIGNED_AT_UTC_SQL} FROM contract_signatures WHERE token_hash = $1 AND status = 'SIGNE' AND signed_at > now() - make_interval(days => $2)`,
    [hashToken(token), SIGNED_PDF_LINK_DAYS]
  );
  const sig = rows[0];
  if (!sig) return NextResponse.json({ error: "Contrat introuvable ou non signé." }, { status: 404 });
  const integrity = await checkContractIntegrity(sig);
  if (!integrity.ok) {
    return NextResponse.json(
      { error: "Ce contrat ne peut pas être affiché : son intégrité n'a pas pu être vérifiée. Aurore a été prévenue." },
      { status: 409 }
    );
  }
  const clientRes = await query("SELECT * FROM clients WHERE id = $1", [sig.client_id]);
  const bytes = await buildContractPdf(sig, clientRes.rows[0]);
  return pdfResponse(bytes, `contrat-signe-v${sig.version}.pdf`);
}
