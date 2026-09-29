import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query } from "./db";

const COOKIE_NAME = "petsitter_session";
// Étape intermédiaire de connexion (mot de passe validé, code de double
// authentification attendu) : jeton séparé, valable 5 minutes.
const MFA_COOKIE_NAME = "petsitter_mfa";

// Durée des sessions : plus courte pour l'administrateur, qui a accès aux
// données de tous les clients et à la comptabilité.
const SESSION_DAYS = { ADMIN: 7, CLIENT: 30 };

// Aucune valeur par défaut ici volontairement : si JWT_SECRET n'est pas
// configuré, on refuse de signer/vérifier des sessions plutôt que d'utiliser
// un secret connu de tous (ce qui permettrait de forger n'importe quelle
// session admin). L'erreur ne survient qu'à l'usage, pas au build.
function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "JWT_SECRET manquant ou trop court. Génère-le avec : openssl rand -hex 32"
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

// Empreinte calculée avec un coût inférieur à l'actuel (anciens comptes) :
// à recalculer lors de la prochaine connexion réussie.
export function needsRehash(hash) {
  try {
    return bcrypt.getRounds(hash) < 12;
  } catch {
    return false;
  }
}

// Empreinte bcrypt factice (coût 12, d'un mot de passe aléatoire jeté) :
// comparée quand l'email n'existe pas, pour que la réponse prenne exactement
// le même temps qu'avec un vrai compte et ne révèle pas quels comptes existent.
const DUMMY_HASH = "$2b$12$tSuFJBLSMM57MjPzBIfw5.UcDYPFKb/2gRFfw995A3fPihr3/dj0S";
export async function verifyAgainstDummy(pw) {
  await bcrypt.compare(String(pw || ""), DUMMY_HASH);
  return false;
}

const cookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge,
});

// La session embarque la "version de session" de l'utilisateur : l'incrémenter
// en base (changement de mot de passe, déconnexion de tous les appareils,
// suppression d'accès) invalide immédiatement toutes les sessions existantes.
export async function createSessionCookie(user) {
  const days = SESSION_DAYS[user.role] || 7;
  const token = jwt.sign(
    { userId: user.id, role: user.role, sv: user.session_version || 0 },
    getSecret(),
    { expiresIn: `${days}d`, audience: "session" }
  );
  const store = await cookies();
  store.set(COOKIE_NAME, token, cookieOptions(60 * 60 * 24 * days));
  store.delete(MFA_COOKIE_NAME);
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
  store.delete(MFA_COOKIE_NAME);
}

export async function createMfaPendingCookie(user) {
  const token = jwt.sign({ userId: user.id, sv: user.session_version || 0 }, getSecret(), {
    expiresIn: "5m",
    audience: "mfa",
  });
  const store = await cookies();
  store.set(MFA_COOKIE_NAME, token, { ...cookieOptions(5 * 60), sameSite: "strict" });
}

export async function getMfaPendingUser() {
  const store = await cookies();
  const token = store.get(MFA_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const p = jwt.verify(token, getSecret(), { audience: "mfa" });
    const { rows } = await query("SELECT * FROM users WHERE id = $1", [p.userId]);
    const user = rows[0];
    if (!user || (user.session_version || 0) !== p.sv) return null;
    return user;
  } catch {
    return null;
  }
}

export async function getSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, getSecret(), { audience: "session" });
  } catch {
    return null;
  }
}

// Renvoie l'utilisateur courant (admin ou client) avec ses infos à jour en base,
// seulement si sa session n'a pas été révoquée entre-temps.
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const { rows } = await query("SELECT * FROM users WHERE id = $1", [session.userId]);
  const user = rows[0];
  if (!user) return null;
  if ((user.session_version || 0) !== session.sv) return null;
  if (user.role !== session.role) return null;
  return user;
}

// Invalide toutes les sessions ouvertes de cet utilisateur, sur tous les appareils.
export async function revokeAllSessions(userId) {
  await query("UPDATE users SET session_version = session_version + 1 WHERE id = $1", [userId]);
}

// Page d'arrivée après connexion
export function redirectFor(user) {
  if (user.must_change_password) return "/compte/mot-de-passe";
  return user.role === "ADMIN" ? "/admin" : "/portal";
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

// À appeler en tête de CHAQUE page protégée (pas seulement dans le layout :
// Next.js peut rendre une page sans réexécuter son layout, voir
// node_modules/next/dist/docs/01-app/02-guides/authentication.md).
export async function adminPageGuard() {
  const user = await requireAdmin();
  if (!user) redirect("/login");
  if (user.must_change_password) redirect("/compte/mot-de-passe");
  return user;
}

export async function clientPageGuard() {
  const user = await requireClient();
  if (!user) redirect("/login");
  if (user.must_change_password) redirect("/compte/mot-de-passe");
  return user;
}
