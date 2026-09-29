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
import { readJson } from "@/lib/api";

// Par compte et par IP, avant blocage temporaire
const ACCOUNT_LIMIT = { limit: 6, windowSeconds: 15 * 60 };
// Par adresse IP, tous comptes confondus : bloque les attaques qui essaient un
// mot de passe courant sur de nombreux comptes (et le blocage volontaire du
// compte admin par un tiers devient beaucoup plus difficile).
const IP_LIMIT = { limit: 20, windowSeconds: 15 * 60 };

const tooMany = () =>
  NextResponse.json({ error: "Trop de tentatives. Réessaie dans quelques minutes." }, { status: 429 });

export async function POST(req) {
  try {
    const body = await readJson(req);
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

    // Verrouillage par couple compte + adresse IP : après 6 échecs, cette IP
    // ne peut plus essayer ce compte pendant 15 minutes. Un tiers ne peut donc
    // pas bloquer le compte de sa propriétaire, qui se connecte d'une autre IP.
    const accountKey = `${user.id}|${ip}`;
    if (await isRateLimited("login-account", accountKey, ACCOUNT_LIMIT)) {
      await verifyAgainstDummy(password);
      return tooMany();
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      await recordHit("login-ip", ip);
      await recordHit("login-account", accountKey);
      return genericError;
    }

    // Renforcement transparent des anciennes empreintes de mot de passe
    if (needsRehash(user.password_hash)) {
      await query("UPDATE users SET password_hash = $1 WHERE id = $2", [await hashPassword(password), user.id]);
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
