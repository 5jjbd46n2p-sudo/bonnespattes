import { NextResponse } from "next/server";
import { createSessionCookie, redirectFor } from "@/lib/auth";
import { clientIp, consumeAttempt } from "@/lib/security";
import { readJson } from "@/lib/api";
import { looksLikeActivationToken, hashActivationToken } from "@/lib/activation";
import { activateWithToken } from "@/lib/activationStore";

const INVALID = "Ce lien n'est plus valide : il a déjà servi ou il a expiré. Demandez un nouveau lien à Aurore.";

// Activation de l'espace client : le client choisit son mot de passe via le
// lien reçu par e-mail (usage unique, 72 h), puis il est connecté.
export async function POST(req, { params }) {
  const { token } = await params;
  // Essais comptés avant toute vérification, par adresse IP et par lien.
  const ipOk = await consumeAttempt("activation-ip", clientIp(req), { limit: 10, windowSeconds: 15 * 60 });
  if (!ipOk) {
    return NextResponse.json({ error: "Trop d'essais. Réessayez dans quelques minutes." }, { status: 429 });
  }
  if (!looksLikeActivationToken(token)) return NextResponse.json({ error: INVALID }, { status: 410 });
  const tokenOk = await consumeAttempt("activation-token", hashActivationToken(token), { limit: 10, windowSeconds: 60 * 60 });
  if (!tokenOk) {
    return NextResponse.json({ error: "Trop d'essais. Réessayez dans une heure." }, { status: 429 });
  }

  const body = await readJson(req);
  const password = typeof body?.password === "string" ? body.password : "";
  try {
    const result = await activateWithToken(token, password);
    if (result.error === "invalid") return NextResponse.json({ error: INVALID }, { status: 410 });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    await createSessionCookie(result.user);
    return NextResponse.json({ ok: true, redirect: redirectFor(result.user) });
  } catch (e) {
    console.error("/api/activation/[token] :", e?.message);
    return NextResponse.json({ error: "Une erreur est survenue. Réessayez dans un instant." }, { status: 500 });
  }
}
