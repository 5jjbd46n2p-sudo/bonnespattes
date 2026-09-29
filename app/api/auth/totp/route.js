import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin, verifyPassword, revokeAllSessions, createSessionCookie } from "@/lib/auth";
import { generateTotpSecret, totpUri, verifyTotp, isRateLimited, recordHit, alertAdmin } from "@/lib/security";

// Double authentification de l'administratrice : préparation, activation, désactivation.
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  return NextResponse.json({ enabled: Boolean(admin.totp_enabled) });
}

export async function POST(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const action = body?.action;
  const code = typeof body?.code === "string" ? body.code.replace(/\s/g, "") : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (await isRateLimited("totp-admin", admin.id, { limit: 8, windowSeconds: 15 * 60 })) {
    return NextResponse.json({ error: "Trop d'essais. Réessaie dans quelques minutes." }, { status: 429 });
  }

  // Toute modification exige le mot de passe : une session volée ne suffit pas.
  if (!(await verifyPassword(password, admin.password_hash))) {
    await recordHit("totp-admin", admin.id);
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 400 });
  }

  if (action === "setup") {
    if (admin.totp_enabled) return NextResponse.json({ error: "Déjà activée." }, { status: 400 });
    const secret = generateTotpSecret();
    await query("UPDATE users SET totp_secret = $2, totp_last_step = NULL WHERE id = $1", [admin.id, secret]);
    return NextResponse.json({ secret, uri: totpUri(secret, admin.email) });
  }

  if (action === "enable") {
    if (admin.totp_enabled || !admin.totp_secret) {
      return NextResponse.json({ error: "Commence par générer une clé." }, { status: 400 });
    }
    const step = verifyTotp(admin.totp_secret, code);
    if (step === null) {
      await recordHit("totp-admin", admin.id);
      return NextResponse.json({ error: "Code incorrect. Vérifie l'heure de ton téléphone." }, { status: 400 });
    }
    await query("UPDATE users SET totp_enabled = true, totp_last_step = $2 WHERE id = $1", [admin.id, step]);
    // Les autres sessions ouvertes sans double authentification sont fermées.
    await revokeAllSessions(admin.id);
    const { rows } = await query("SELECT * FROM users WHERE id = $1", [admin.id]);
    await createSessionCookie(rows[0]);
    return NextResponse.json({ ok: true, enabled: true });
  }

  if (action === "disable") {
    if (!admin.totp_enabled) return NextResponse.json({ ok: true, enabled: false });
    const step = verifyTotp(admin.totp_secret, code, admin.totp_last_step);
    if (step === null) {
      await recordHit("totp-admin", admin.id);
      return NextResponse.json({ error: "Code incorrect." }, { status: 400 });
    }
    await query(
      "UPDATE users SET totp_enabled = false, totp_secret = NULL, totp_last_step = NULL WHERE id = $1",
      [admin.id]
    );
    await alertAdmin(admin.email, "la double authentification a été désactivée", [
      "La connexion administrateur ne demande plus de code.",
    ]);
    return NextResponse.json({ ok: true, enabled: false });
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
