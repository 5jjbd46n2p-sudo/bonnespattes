import { NextResponse } from "next/server";
import { clearSessionCookie, getCurrentUser, revokeAllSessions } from "@/lib/auth";

// La déconnexion invalide la session côté serveur (sur tous les appareils) :
// un cookie de session copié ou volé cesse aussitôt de fonctionner.
export async function POST() {
  const user = await getCurrentUser();
  if (user) await revokeAllSessions(user.id);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
