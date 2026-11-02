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
import { clientIp, consumeAttempt, clearAttempts } from "@/lib/security";
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
    const normalizedEmail = email.trim().toLowerCase();
    // Clé email + IP, que le compte existe ou non : le blocage (429) ne révèle
    // donc pas quels comptes existent. Après 6 essais, cette IP ne peut plus
    // essayer cet email pendant 15 minutes ; la propriétaire du compte, depuis
    // une autre IP, n'est pas bloquée.
    const accountKey = `${normalizedEmail}|${ip}`;

    // Essais enregistrés AVANT la vérification (voir consumeAttempt).
    const ipOk = await consumeAttempt("login-ip", ip, IP_LIMIT);
    const accountOk = ipOk && (await consumeAttempt("login-account", accountKey, ACCOUNT_LIMIT));
    if (!ipOk || !accountOk) {
      await verifyAgainstDummy(password); // même durée de réponse dans tous les cas
      return tooMany();
    }

    const { rows } = await query("SELECT * FROM users WHERE email = $1", [normalizedEmail]);
    const user = rows[0];

    // Message générique dans tous les cas d'échec, pour ne jamais indiquer si
    // c'est l'email ou le mot de passe qui est incorrect (anti-énumération).
    const genericError = NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });

    if (!user) {
      await verifyAgainstDummy(password); // même durée de réponse qu'avec un vrai compte
      return genericError;
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return genericError;

    // Connexion réussie : la propriétaire ne doit pas se bloquer elle-même.
    await clearAttempts("login-account", accountKey);

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
    console.error("Connexion :", e?.message);
    return NextResponse.json({ error: "Une erreur est survenue. Réessaie plus tard." }, { status: 500 });
  }
}
