import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getMfaPendingUser, createSessionCookie, redirectFor } from "@/lib/auth";
import { clientIp, consumeAttempt, clearAttempts, verifyTotp, readTotpSecret, alertAdmin } from "@/lib/security";
import { looksLikeBackupCode, hashBackupCode } from "@/lib/backupCodes";
import { audit } from "@/lib/audit";
import { readJson } from "@/lib/api";

// 2e étape de connexion : code à 6 chiffres de l'application d'authentification,
// ou un code de secours (XXXX-XXXX, usage unique).
const LIMIT = { limit: 5, windowSeconds: 15 * 60 };

export async function POST(req) {
  const user = await getMfaPendingUser();
  if (!user || !user.totp_enabled || !user.totp_secret) {
    return NextResponse.json({ error: "Session expirée. Reconnecte-toi." }, { status: 401 });
  }
  const body = await readJson(req);
  const raw = typeof body?.code === "string" ? body.code.slice(0, 40) : "";
  const code = raw.replace(/\s/g, "");

  // Essais enregistrés avant la vérification (voir consumeAttempt).
  const key = `${user.id}|${clientIp(req)}`;
  const userOk = await consumeAttempt("mfa", user.id, LIMIT);
  const ipOk = userOk && (await consumeAttempt("mfa-ip", key, LIMIT));
  if (!userOk || !ipOk) {
    return NextResponse.json({ error: "Trop d'essais. Réessaie dans quelques minutes." }, { status: 429 });
  }

  if (looksLikeBackupCode(raw)) {
    // Usage unique garanti par la condition used_at IS NULL (atomique).
    const used = await query(
      "UPDATE backup_codes SET used_at = now() WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL RETURNING id",
      [user.id, hashBackupCode(raw)]
    );
    if (!used.rows[0]) return NextResponse.json({ error: "Code de secours incorrect ou déjà utilisé." }, { status: 400 });
    const left = await query("SELECT COUNT(*)::int AS n FROM backup_codes WHERE user_id = $1 AND used_at IS NULL", [user.id]);
    await audit(null, { actorId: user.id, action: "mfa.backup_code_used", entity: "user", entityId: user.id, details: { remaining: left.rows[0].n } });
    await alertAdmin(user.email, "un code de secours a été utilisé pour se connecter", [
      `Il reste ${left.rows[0].n} code(s) de secours.`,
      "Si ce n'était pas toi, change ton mot de passe et régénère tes codes dans Réglages > Sécurité.",
    ]);
  } else {
    let secret;
    try {
      secret = await readTotpSecret(user);
    } catch (e) {
      console.error("/api/auth/mfa : secret illisible :", e?.message);
      await alertAdmin(user.email, "le secret de double authentification est illisible", [
        "La connexion a été refusée. Vérifie la variable DATA_ENCRYPTION_KEY, ou utilise un code de secours.",
      ]);
      return NextResponse.json({ error: "Connexion impossible pour le moment. Utilise un code de secours." }, { status: 500 });
    }
    const step = verifyTotp(secret, code, user.totp_last_step);
    if (step === null) {
      return NextResponse.json({ error: "Code incorrect." }, { status: 400 });
    }
    // Un code déjà utilisé ne peut pas resservir (anti-rejeu).
    const upd = await query(
      "UPDATE users SET totp_last_step = $2 WHERE id = $1 AND (totp_last_step IS NULL OR totp_last_step < $2) RETURNING id",
      [user.id, step]
    );
    if (!upd.rows[0]) return NextResponse.json({ error: "Code déjà utilisé. Attends le suivant." }, { status: 400 });
  }

  // Connexion réussie : les essais ne s'accumulent pas d'une connexion à l'autre.
  await clearAttempts("mfa", user.id);
  await clearAttempts("mfa-ip", key);
  await createSessionCookie(user);
  return NextResponse.json({ ok: true, redirect: redirectFor(user) });
}
