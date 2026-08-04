import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyPassword, createSessionCookie } from "@/lib/auth";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
    }
    const { rows } = await query("SELECT * FROM users WHERE email = $1", [
      email.trim().toLowerCase(),
    ]);
    const user = rows[0];
    if (!user) {
      return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
    }
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
    }
    await createSessionCookie({ userId: user.id, role: user.role });
    return NextResponse.json({
      ok: true,
      role: user.role,
      redirect: user.role === "ADMIN" ? "/admin" : "/portal",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur : " + e.message }, { status: 500 });
  }
}
