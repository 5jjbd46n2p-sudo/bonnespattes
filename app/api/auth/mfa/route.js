import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getMfaPendingUser, createSessionCookie, redirectFor } from "@/lib/auth";
import { clientIp, consumeAttempt, clearAttempts, verifyTotp } from "@/lib/security";
import { readJson } from "@/lib/api";

// 2e étape de connexion : code à 6 chiffres de l'application d'authentification.
const LIMIT = { limit: 5, windowSeconds: 15 * 60 };

export async function POST(req) {
  const user = await getMfaPendingUser();
  if (!user || !user.totp_enabled || !user.totp_secret) {
    return NextResponse.json({ error: "Session expirée. Reconnecte-toi." }, { status: 401 });
  }
  const body = await readJson(req);
  const code = typeof body?.code === "string" ? body.code.replace(/\s/g, "") : "";

  // Essais enregistrés avant la vérification (voir consumeAttempt).
  const key = `${user.id}|${clientIp(req)}`;
  const userOk = await consumeAttempt("mfa", user.id, LIMIT);
  const ipOk = userOk && (await consumeAttempt("mfa-ip", key, LIMIT));
  if (!userOk || !ipOk) {
    return NextResponse.json({ error: "Trop d'essais. Réessaie dans quelques minutes." }, { status: 429 });
  }

  const step = verifyTotp(user.totp_secret, code, user.totp_last_step);
  if (step === null) {
    return NextResponse.json({ error: "Code incorrect." }, { status: 400 });
  }

  // Un code déjà utilisé ne peut pas resservir (anti-rejeu).
  const upd = await query(
    "UPDATE users SET totp_last_step = $2 WHERE id = $1 AND (totp_last_step IS NULL OR totp_last_step < $2) RETURNING id",
    [user.id, step]
  );
  if (!upd.rows[0]) return NextResponse.json({ error: "Code déjà utilisé. Attends le suivant." }, { status: 400 });

  // Connexion réussie : les essais ne s'accumulent pas d'une connexion à l'autre.
  await clearAttempts("mfa", user.id);
  await clearAttempts("mfa-ip", key);
  await createSessionCookie(user);
  return NextResponse.json({ ok: true, redirect: redirectFor(user) });
}
