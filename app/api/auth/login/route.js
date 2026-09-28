import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyPassword, createSessionCookie } from "@/lib/auth";

const MAX_ATTEMPTS = 6;
const LOCK_MINUTES = 15;

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const { rows } = await query("SELECT * FROM users WHERE email = $1", [normalizedEmail]);
    const user = rows[0];

    // Message générique dans tous les cas d'échec, pour ne jamais indiquer si
    // c'est l'email ou le mot de passe qui est incorrect (anti-énumération).
    const genericError = NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });

    if (!user) return genericError;

    // Compte temporairement verrouillé après plusieurs échecs consécutifs.
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessaie dans quelques minutes." },
        { status: 429 }
      );
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await query(
          "UPDATE users SET failed_login_attempts = 0, locked_until = now() + make_interval(mins => $1) WHERE id = $2",
          [LOCK_MINUTES, user.id]
        );
        return NextResponse.json(
          { error: "Trop de tentatives. Réessaie dans quelques minutes." },
          { status: 429 }
        );
      }
      await query("UPDATE users SET failed_login_attempts = $1 WHERE id = $2", [attempts, user.id]);
      return genericError;
    }

    if (user.failed_login_attempts > 0 || user.locked_until) {
      await query("UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1", [
        user.id,
      ]);
    }

    await createSessionCookie({ userId: user.id, role: user.role });
    return NextResponse.json({
      ok: true,
      role: user.role,
      redirect: user.role === "ADMIN" ? "/admin" : "/portal",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Une erreur est survenue. Réessaie plus tard." }, { status: 500 });
  }
}
