import crypto from "crypto";

// Lien d'activation de l'espace client (remplace l'envoi d'un mot de passe
// provisoire par e-mail). Le jeton n'existe qu'en clair dans le lien envoyé ;
// la base ne garde que son empreinte SHA-256. Usage unique, valable 72 h.
export const ACTIVATION_TTL_HOURS = 72;

export function hashActivationToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

export function newActivationToken() {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, hash: hashActivationToken(token) };
}

export function activationExpiry(now = new Date()) {
  return new Date(now.getTime() + ACTIVATION_TTL_HOURS * 3600 * 1000);
}

export function isActivationUsable(row, now = new Date()) {
  if (!row || row.used_at) return false;
  return new Date(row.expires_at).getTime() > now.getTime();
}

// 32 octets en base64url = 43 caractères : on refuse tout le reste sans requête.
export function looksLikeActivationToken(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

export function activationLink(token) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  return `${base}/activer/${token}`;
}
