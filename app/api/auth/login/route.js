import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  verifyPassword,
  verifyAgainstDummy,
  hashPassword,
  needsRehash,
  createSessionCookie,
  createMfaPendingCookie,
  redirectFor,
} from "@/lib/auth";
import { clientIp, isRateLimited, recordHit } from "@/lib/security";

const MAX_ATTEMPTS = 6; // par compte, avant verrouillage temporaire
const LOCK_MINUTES = 15;
// Par adresse IP, tous comptes confondus : bloque les attaques qui essaient un
// mot de passe courant sur de nombreux comptes (et le blocage volontaire du
// compte admin par un tiers devient beaucoup plus difficile).
const IP_LIMIT = { limit: 20, windowSeconds: 15 * 60 };

const tooMany = () =>
  NextResponse.json({ error: "Trop de tentatives. Réessaie dans quelques minutes." }, { status: 429 });

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || !password || email.length > 200 || password.length > 200) {
      return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
    }

    const ip = clientIp(req);
    if (await isRateLimited("login-ip", ip, IP_LIMIT)) return tooMany();

    const normalizedEmail = email.trim().toLowerCase();
    const { rows } = await query("SELECT * FROM users WHERE email = $1", [normalizedEmail]);
    const user = rows[0];

    // Message générique dans tous les cas d'échec, pour ne jamais indiquer si
    // c'est l'email ou le mot de passe qui est incorrect (anti-énumération).
    const genericError = NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });

    if (!user) {
      await verifyAgainstDummy(password); // même durée de réponse qu'avec un vrai compte
      await recordHit("login-ip", ip);
      return genericError;
    }

    // Compte temporairement verrouillé après plusieurs échecs consécutifs.
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      await verifyAgainstDummy(password);
      return tooMany();
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      await recordHit("login-ip", ip);
      const attempts = (user.failed_login_attempts || 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await query(
          "UPDATE users SET failed_login_attempts = 0, locked_until = now() + make_interval(mins => $1) WHERE id = $2",
          [LOCK_MINUTES, user.id]
        );
        return tooMany();
      }
      await query("UPDATE users SET failed_login_attempts = $1 WHERE id = $2", [attempts, user.id]);
      return genericError;
    }

    // Renforcement transparent des anciennes empreintes de mot de passe
    if (needsRehash(user.password_hash)) {
      await query("UPDATE users SET password_hash = $1 WHERE id = $2", [await hashPassword(password), user.id]);
    }

    if (user.failed_login_attempts > 0 || user.locked_until) {
      await query("UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1", [
        user.id,
      ]);
    }

    // Double authentification activée : le mot de passe seul ne suffit pas.
    if (user.totp_enabled && user.totp_secret) {
      await createMfaPendingCookie(user);
      return NextResponse.json({ ok: true, mfaRequired: true });
    }

    await createSessionCookie(user);
    return NextResponse.json({ ok: true, role: user.role, redirect: redirectFor(user) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Une erreur est survenue. Réessaie plus tard." }, { status: 500 });
  }
}
