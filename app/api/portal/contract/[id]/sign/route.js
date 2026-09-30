import { NextResponse } from "next/server";
import { tx } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { getClientIp } from "@/lib/contract";
import { CONTRACT_CHECKBOXES } from "@/lib/contractTemplate";
import { sendSignedCopies } from "@/lib/contractFinalize";
import { isRateLimited, recordHit } from "@/lib/security";
import { readJson, isUuid } from "@/lib/api";

const bad = (error, status = 400) => NextResponse.json({ error }, { status });

// Signature depuis l'espace client : l'identité est confirmée par la connexion
// (identifiant + mot de passe) ; pas de code par email.
export async function POST(req, { params }) {
  const user = await requireClient();
  if (!user) return bad("Non autorisé.", 401);
  const { id } = await params;
  if (!isUuid(id)) return bad("Contrat introuvable.", 404);

  const body = await readJson(req);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 200) : "";
  const emergency = typeof body?.emergencyContact === "string" ? body.emergencyContact.trim().slice(0, 500) : "";
  const vet = typeof body?.vetInfo === "string" ? body.vetInfo.trim().slice(0, 500) : "";
  const cbIn = body?.checkboxes && typeof body.checkboxes === "object" ? body.checkboxes : {};
  const checkboxes = {};
  for (const item of CONTRACT_CHECKBOXES) checkboxes[item.id] = cbIn[item.id] === true;

  if (name.length < 3) return bad("Veuillez saisir votre nom complet (3 caractères minimum).");
  if (!checkboxes.accept) return bad("Vous devez accepter le contrat pour le signer.");
  if (!emergency) return bad("Veuillez indiquer une personne à prévenir en cas d'urgence.");

  if (await isRateLimited("contract-sign-user", user.id, { limit: 20, windowSeconds: 60 * 60 })) {
    return bad("Trop d'essais. Réessayez dans une heure.", 429);
  }
  await recordHit("contract-sign-user", user.id);
  const ip = getClientIp(req);
  const ua = (req.headers.get("user-agent") || "").slice(0, 500);

  const result = await tx(async (db) => {
    const { rows } = await db.query(
      "SELECT * FROM contract_signatures WHERE id = $1 AND client_id = $2 FOR UPDATE",
      [id, user.client_id]
    );
    const sig = rows[0];
    if (!sig) return { error: "Contrat introuvable.", status: 404 };
    if (sig.status === "SIGNE") return { error: "Ce contrat est déjà signé.", status: 409 };
    if (sig.status !== "ENVOYE") return { error: "Ce contrat n'est plus valide. Demandez un nouvel envoi.", status: 410 };
    if (new Date(sig.expires_at) <= new Date()) return { error: "Ce contrat a expiré. Demandez un nouvel envoi.", status: 410 };
    const upd = await db.query(
      `UPDATE contract_signatures
          SET status = 'SIGNE', signed_at = now(), signer_name = $2, signer_ip = $3, signer_user_agent = $4,
              checkboxes = $5::jsonb, emergency_contact = $6, vet_info = $7, otp_hash = NULL, otp_expires_at = NULL,
              auth_method = 'COMPTE_CLIENT'
        WHERE id = $1 AND status = 'ENVOYE' RETURNING *`,
      [sig.id, name, ip, ua, JSON.stringify(checkboxes), emergency, vet]
    );
    return { signed: upd.rows[0] };
  });
  if (result.error) return bad(result.error, result.status);

  const emailed = await sendSignedCopies(result.signed);
  return NextResponse.json({ ok: true, emailed });
}
