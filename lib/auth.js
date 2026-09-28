import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { query } from "./db";

const COOKIE_NAME = "petsitter_session";

// Aucune valeur par défaut ici volontairement : si JWT_SECRET n'est pas
// configuré, on refuse de signer/vérifier des sessions plutôt que d'utiliser
// un secret connu de tous (ce qui permettrait de forger n'importe quelle
// session admin). L'erreur ne survient qu'à l'usage, pas au build.
function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "JWT_SECRET manquant ou trop court. Ajoute une variable d'environnement JWT_SECRET (chaîne aléatoire longue, ex. openssl rand -hex 32) avant de pouvoir te connecter."
    );
  }
  return secret;
}

export async function hashPassword(pw) {
  return bcrypt.hash(pw, 12);
}

export async function verifyPassword(pw, hash) {
  return bcrypt.compare(pw, hash);
}

export function signSession(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: "30d" });
}

export async function createSessionCookie(payload) {
  const token = signSession(payload);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, getSecret());
  } catch {
    return null;
  }
}

// Renvoie l'utilisateur courant (admin ou client) avec ses infos à jour en base
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const { rows } = await query("SELECT * FROM users WHERE id = $1", [session.userId]);
  return rows[0] || null;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export async function requireClient() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENT") return null;
  return user;
}
