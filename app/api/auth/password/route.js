import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser, verifyPassword, hashPassword, createSessionCookie, redirectFor } from "@/lib/auth";
import { isRateLimited, recordHit, passwordProblem, alertAdmin } from "@/lib/security";
import { readJson } from "@/lib/api";

// Changement de mot de passe par l'utilisateur connecté (admin ou client).
// Obligatoire à la première connexion d'un client dont l'accès a été créé par
// l'administratrice : le mot de passe reçu par email ne sert qu'une fois.
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const body = await readJson(req);
  const current = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const next = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (await isRateLimited("password-change", user.id, { limit: 5, windowSeconds: 15 * 60 })) {
    return NextResponse.json({ error: "Trop d'essais. Réessaie dans quelques minutes." }, { status: 429 });
  }
  if (!(await verifyPassword(current, user.password_hash))) {
    await recordHit("password-change", user.id);
    return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 400 });
  }
  const problem = passwordProblem(next, { email: user.email });
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  if (await verifyPassword(next, user.password_hash)) {
    return NextResponse.json({ error: "Choisis un mot de passe différent de l'actuel." }, { status: 400 });
  }

  // Nouvelle version de session : tous les autres appareils sont déconnectés.
  const { rows } = await query(
    `UPDATE users SET password_hash = $2, must_change_password = false, password_changed_at = now(),
            session_version = session_version + 1
      WHERE id = $1 RETURNING *`,
    [user.id, await hashPassword(next)]
  );
  await createSessionCookie(rows[0]);
  if (user.role === "ADMIN") {
    await alertAdmin(user.email, "le mot de passe administrateur a été changé", [
      "Toutes les autres sessions ouvertes ont été déconnectées.",
    ]);
  }
  return NextResponse.json({ ok: true, redirect: redirectFor(rows[0]) });
}
