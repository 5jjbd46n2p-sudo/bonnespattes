import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashToken, generateOtp, hashOtp, OTP_MAX_SENT, OTP_TTL_MINUTES } from "@/lib/contract";
import { sendContractOtpEmail } from "@/lib/email";
import { clientIp, isRateLimited, recordHit } from "@/lib/security";

// Réponse volontairement générique : ne révèle rien sur l'état du jeton.
const GENERIC = { ok: true };

export async function POST(req, { params }) {
  const { token } = await params;
  if (!token || typeof token !== "string" || token.length > 200) return NextResponse.json(GENERIC);
  // Limite par IP : empêche d'utiliser le site pour envoyer des emails en masse.
  const ip = clientIp(req);
  if (await isRateLimited("contract-otp-ip", ip, { limit: 10, windowSeconds: 60 * 60 })) {
    return NextResponse.json(GENERIC);
  }
  await recordHit("contract-otp-ip", ip);
  const tokenHash = hashToken(token);
  const code = generateOtp();

  // Mise à jour atomique : contrat en attente, non expiré, moins de 5 envois,
  // et au moins 30 s depuis le dernier envoi.
  const { rows } = await query(
    `UPDATE contract_signatures
        SET otp_hash = $2,
            otp_expires_at = now() + ($3 || ' minutes')::interval,
            otp_attempts = 0,
            otp_sent_count = otp_sent_count + 1
      WHERE token_hash = $1 AND status = 'ENVOYE' AND expires_at > now()
        AND otp_sent_count < $4
        AND (otp_expires_at IS NULL OR otp_expires_at < now() + ($3 || ' minutes')::interval - interval '30 seconds')
      RETURNING sent_to, client_id`,
    [tokenHash, hashOtp(tokenHash, code), String(OTP_TTL_MINUTES), OTP_MAX_SENT]
  );
  const row = rows[0];
  if (!row) return NextResponse.json(GENERIC);

  try {
    const c = await query("SELECT first_name, last_name FROM clients WHERE id = $1", [row.client_id]);
    const name = c.rows[0] ? `${c.rows[0].first_name} ${c.rows[0].last_name}` : "";
    await sendContractOtpEmail({ to: row.sent_to, clientName: name, code });
  } catch (e) {
    console.error("Envoi du code de signature échoué :", e.message);
  }
  return NextResponse.json(GENERIC);
}
