import { NextResponse } from "next/server";
import { query, tx } from "@/lib/db";
import { requireAdmin, verifyPassword, revokeAllSessions, createSessionCookie } from "@/lib/auth";
import { generateTotpSecret, totpUri, verifyTotp, consumeAttempt, alertAdmin, readTotpSecret } from "@/lib/security";
import { encrypt } from "@/lib/crypto";
import { generateBackupCodes, hashBackupCode } from "@/lib/backupCodes";
import { audit } from "@/lib/audit";
import { readJson } from "@/lib/api";

const LIMIT = { limit: 8, windowSeconds: 15 * 60 };

async function remainingBackupCodes(userId) {
  const { rows } = await query("SELECT COUNT(*)::int AS n FROM backup_codes WHERE user_id = $1 AND used_at IS NULL", [userId]);
  return rows[0].n;
}

// Remplace les codes de secours de l'utilisateur (dans la transaction db) et
// renvoie les codes en clair, à afficher une seule fois.
async function replaceBackupCodes(db, userId) {
  const codes = generateBackupCodes();
  await db.query("DELETE FROM backup_codes WHERE user_id = $1", [userId]);
  for (const c of codes) {
    await db.query("INSERT INTO backup_codes (user_id, code_hash) VALUES ($1, $2)", [userId, hashBackupCode(c)]);
  }
  return codes;
}

// Double authentification de l'administratrice : préparation, activation,
// codes de secours, désactivation.
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  return NextResponse.json({ enabled: Boolean(admin.totp_enabled), backupCodesLeft: await remainingBackupCodes(admin.id) });
}

export async function POST(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const body = await readJson(req);
  const action = body?.action;
  const code = typeof body?.code === "string" ? body.code.replace(/\s/g, "") : "";
  const password = typeof body?.password === "string" ? body.password : "";

  // Essai compté avant toute vérification (voir consumeAttempt).
  if (!(await consumeAttempt("totp-admin", admin.id, LIMIT))) {
    return NextResponse.json({ error: "Trop d'essais. Réessaie dans quelques minutes." }, { status: 429 });
  }

  // Toute modification exige le mot de passe : une session volée ne suffit pas.
  if (!(await verifyPassword(password, admin.password_hash))) {
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 400 });
  }

  try {
    if (action === "setup") {
      if (admin.totp_enabled) return NextResponse.json({ error: "Déjà activée." }, { status: 400 });
      const secret = generateTotpSecret();
      await query("UPDATE users SET totp_secret = $2, totp_last_step = NULL WHERE id = $1", [admin.id, encrypt(secret)]);
      return NextResponse.json({ secret, uri: totpUri(secret, admin.email) });
    }

    if (action === "enable") {
      const secret = await readTotpSecret(admin);
      if (admin.totp_enabled || !secret) {
        return NextResponse.json({ error: "Commence par générer une clé." }, { status: 400 });
      }
      const step = verifyTotp(secret, code);
      if (step === null) {
        return NextResponse.json({ error: "Code incorrect. Vérifie l'heure de ton téléphone." }, { status: 400 });
      }
      const backupCodes = await tx(async (db) => {
        await db.query("UPDATE users SET totp_enabled = true, totp_last_step = $2 WHERE id = $1", [admin.id, step]);
        const codes = await replaceBackupCodes(db, admin.id);
        await audit(db, { actorId: admin.id, action: "mfa.enable", entity: "user", entityId: admin.id });
        return codes;
      });
      // Les autres sessions ouvertes sans double authentification sont fermées.
      await revokeAllSessions(admin.id);
      const { rows } = await query("SELECT * FROM users WHERE id = $1", [admin.id]);
      await createSessionCookie(rows[0]);
      return NextResponse.json({ ok: true, enabled: true, backupCodes });
    }

    if (action === "regenerate-codes") {
      if (!admin.totp_enabled) return NextResponse.json({ error: "La double authentification n'est pas activée." }, { status: 400 });
      const step = verifyTotp(await readTotpSecret(admin), code, admin.totp_last_step);
      if (step === null) return NextResponse.json({ error: "Code incorrect." }, { status: 400 });
      const backupCodes = await tx(async (db) => {
        await db.query("UPDATE users SET totp_last_step = $2 WHERE id = $1", [admin.id, step]);
        const codes = await replaceBackupCodes(db, admin.id);
        await audit(db, { actorId: admin.id, action: "mfa.backup_codes_regenerated", entity: "user", entityId: admin.id });
        return codes;
      });
      return NextResponse.json({ ok: true, backupCodes });
    }

    if (action === "disable") {
      if (!admin.totp_enabled) return NextResponse.json({ ok: true, enabled: false });
      const step = verifyTotp(await readTotpSecret(admin), code, admin.totp_last_step);
      if (step === null) {
        return NextResponse.json({ error: "Code incorrect." }, { status: 400 });
      }
      await tx(async (db) => {
        await db.query("UPDATE users SET totp_enabled = false, totp_secret = NULL, totp_last_step = NULL WHERE id = $1", [admin.id]);
        await db.query("DELETE FROM backup_codes WHERE user_id = $1", [admin.id]);
        await audit(db, { actorId: admin.id, action: "mfa.disable", entity: "user", entityId: admin.id });
      });
      await alertAdmin(admin.email, "la double authentification a été désactivée", [
        "La connexion administrateur ne demande plus de code.",
      ]);
      return NextResponse.json({ ok: true, enabled: false });
    }
  } catch (e) {
    console.error("/api/auth/totp :", e?.message);
    return NextResponse.json({ error: "Une erreur est survenue. Réessaie plus tard." }, { status: 500 });
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
