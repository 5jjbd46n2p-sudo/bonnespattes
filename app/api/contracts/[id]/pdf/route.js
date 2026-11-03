import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { buildContractPdf, pdfResponse } from "@/lib/contract";
import { SIGNED_AT_UTC_SQL } from "@/lib/contractSeal";
import { checkContractIntegrity } from "@/lib/contractFinalize";
import { isUuid } from "@/lib/api";


export async function GET(_req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Contrat introuvable." }, { status: 404 });

  const { rows } = await query(`SELECT *, ${SIGNED_AT_UTC_SQL} FROM contract_signatures WHERE id = $1`, [id]);
  const sig = rows[0];
  if (!sig) return NextResponse.json({ error: "Contrat introuvable." }, { status: 404 });

  const isAdmin = user.role === "ADMIN";
  const isOwner = user.role === "CLIENT" && user.client_id && user.client_id === sig.client_id;
  if (!isAdmin && !(isOwner && sig.status === "SIGNE")) {
    return NextResponse.json({ error: "Contrat introuvable." }, { status: 404 });
  }

  const integrity = await checkContractIntegrity(sig, user.id);
  if (!integrity.ok) {
    const msg = isAdmin
      ? "Ce contrat ne correspond plus à son sceau d'intégrité : PDF refusé. Une alerte t'a été envoyée."
      : "Ce contrat ne peut pas être affiché : son intégrité n'a pas pu être vérifiée. Aurore a été prévenue.";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  const clientRes = await query("SELECT * FROM clients WHERE id = $1", [sig.client_id]);
  const bytes = await buildContractPdf(sig, clientRes.rows[0]);
  return pdfResponse(bytes, `contrat-v${sig.version}${sig.status === "SIGNE" ? "" : "-non-signe"}.pdf`);
}
