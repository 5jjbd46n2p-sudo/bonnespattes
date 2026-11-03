import { NextResponse } from "next/server";
import { tx } from "@/lib/db";
import {
  hashToken, hashOtp, safeEqualHex, getClientIp, OTP_MAX_ATTEMPTS,
} from "@/lib/contract";
import { CONTRACT_CHECKBOXES } from "@/lib/contractTemplate";
import { sendSignedCopies, sealSignedContract } from "@/lib/contractFinalize";
import { SIGNED_AT_UTC_SQL } from "@/lib/contractSeal";
import { consumeAttempt } from "@/lib/security";
import { readJson } from "@/lib/api";

const bad = (error, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req, { params }) {
  const { token } = await params;
  if (!token || typeof token !== "string" || token.length > 200) return bad("Lien invalide.", 404);

  const body = await readJson(req);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 200) : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const emergency = typeof body?.emergencyContact === "string" ? body.emergencyContact.trim().slice(0, 500) : "";
  const vet = typeof body?.vetInfo === "string" ? body.vetInfo.trim().slice(0, 500) : "";
  const cbIn = body?.checkboxes && typeof body.checkboxes === "object" ? body.checkboxes : {};
  const checkboxes = {};
  for (const item of CONTRACT_CHECKBOXES) checkboxes[item.id] = cbIn[item.id] === true;

  if (name.length < 3) return bad("Veuillez saisir votre nom complet (3 caractères minimum).");
  if (!checkboxes.accept) return bad("Vous devez accepter le contrat pour le signer.");
  if (!emergency) return bad("Veuillez indiquer une personne à prévenir en cas d'urgence.");
  if (!/^\d{6}$/.test(code)) return bad("Le code doit comporter 6 chiffres.");

  const tokenHash = hashToken(token);
  const ip = getClientIp(req);
  if (!(await consumeAttempt("contract-sign-ip", ip || "unknown", { limit: 20, windowSeconds: 60 * 60 }))) {
    return bad("Trop d'essais. Réessayez dans une heure.", 429);
  }
  const ua = (req.headers.get("user-agent") || "").slice(0, 500);

  const result = await tx(async (db) => {
    const { rows } = await db.query("SELECT * FROM contract_signatures WHERE token_hash = $1 FOR UPDATE", [tokenHash]);
    const sig = rows[0];
    if (!sig) return { error: "Lien invalide.", status: 404 };
    if (sig.status === "SIGNE") return { error: "Ce contrat est déjà signé.", status: 409 };
    if (sig.status !== "ENVOYE") return { error: "Ce lien n'est plus valide. Demandez un nouvel envoi du contrat.", status: 410 };
    if (new Date(sig.expires_at) <= new Date()) return { error: "Ce lien a expiré. Demandez un nouvel envoi du contrat.", status: 410 };
    if (!sig.otp_hash || !sig.otp_expires_at || new Date(sig.otp_expires_at) <= new Date()) {
      return { error: "Le code a expiré ou n'a pas été demandé. Demandez un nouveau code.", status: 400 };
    }
    if (sig.otp_attempts >= OTP_MAX_ATTEMPTS) {
      return { error: "Trop d'essais. Demandez un nouveau code.", status: 429 };
    }
    if (!safeEqualHex(sig.otp_hash, hashOtp(tokenHash, code))) {
      // L'essai est compté même si la transaction se termine normalement (pas de rollback).
      await db.query("UPDATE contract_signatures SET otp_attempts = otp_attempts + 1 WHERE id = $1", [sig.id]);
      return { error: "Code incorrect.", status: 400 };
    }
    const upd = await db.query(
      `UPDATE contract_signatures
          SET status = 'SIGNE', signed_at = now(), signer_name = $2, signer_ip = $3, signer_user_agent = $4,
              checkboxes = $5::jsonb, emergency_contact = $6, vet_info = $7, otp_hash = NULL, otp_expires_at = NULL,
              auth_method = 'EMAIL_OTP'
        WHERE id = $1 AND status = 'ENVOYE' RETURNING *, ${SIGNED_AT_UTC_SQL}`,
      [sig.id, name, ip, ua, JSON.stringify(checkboxes), emergency, vet]
    );
    if (!upd.rows[0]) return { error: "Ce contrat est déjà signé.", status: 409 };
    return { signed: await sealSignedContract(db, upd.rows[0], null) };
  });

  if (result.error) return bad(result.error, result.status);
  const signed = result.signed;

  const emailed = await sendSignedCopies(signed);
  return NextResponse.json({ ok: true, emailed });
}
