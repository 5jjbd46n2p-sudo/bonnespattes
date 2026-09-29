import crypto from "crypto";
import { query } from "./db";

// ---------------------------------------------------------------------------
// Adresse IP du visiteur (derrière le proxy Vercel) et empreinte non réversible
// ---------------------------------------------------------------------------
export function clientIp(req) {
  const xff = req.headers.get("x-forwarded-for");
  return (xff ? xff.split(",")[0].trim() : req.headers.get("x-real-ip") || "").slice(0, 100) || "unknown";
}

function ipSalt() {
  return process.env.LEAD_IP_SALT || process.env.JWT_SECRET || "";
}

export function hashKey(value) {
  return crypto.createHash("sha256").update(`${value}|${ipSalt()}`).digest("hex");
}

// ---------------------------------------------------------------------------
// Limitation du nombre de tentatives (stockée en base : fonctionne même avec
// plusieurs instances serverless). Renvoie true si la limite est dépassée.
// ---------------------------------------------------------------------------
export async function isRateLimited(bucket, key, { limit, windowSeconds }) {
  const keyHash = hashKey(key);
  const { rows } = await query(
    `SELECT COUNT(*)::int AS n FROM rate_limit_hits
      WHERE bucket = $1 AND key_hash = $2 AND created_at > now() - make_interval(secs => $3)`,
    [bucket, keyHash, windowSeconds]
  );
  return rows[0].n >= limit;
}

export async function recordHit(bucket, key) {
  await query("INSERT INTO rate_limit_hits (bucket, key_hash) VALUES ($1, $2)", [bucket, hashKey(key)]);
}

// ---------------------------------------------------------------------------
// Mots de passe
// ---------------------------------------------------------------------------
export const PASSWORD_MIN_LENGTH = 12;

// Renvoie un message d'erreur, ou null si le mot de passe est acceptable.
export function passwordProblem(password, { email } = {}) {
  if (typeof password !== "string") return "Mot de passe invalide.";
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  }
  if (password.length > 200) return "Mot de passe trop long (200 caractères maximum).";
  if (new Set(password).size < 5) return "Mot de passe trop simple : varie davantage les caractères.";
  const local = String(email || "").split("@")[0].toLowerCase();
  if (local.length >= 4 && password.toLowerCase().includes(local)) {
    return "Le mot de passe ne doit pas contenir ton adresse email.";
  }
  return null;
}


// ---------------------------------------------------------------------------
// Double authentification TOTP (RFC 6238), compatible avec les applications
// Google Authenticator, Microsoft Authenticator, 1Password, Bitwarden…
// ---------------------------------------------------------------------------
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateTotpSecret() {
  const bytes = crypto.randomBytes(20);
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function base32Decode(secret) {
  const clean = String(secret).toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const ch of clean) bits += B32.indexOf(ch).toString(2).padStart(5, "0");
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function hotp(key, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac("sha1", key).update(buf).digest();
  const o = h[h.length - 1] & 0xf;
  const code = ((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).toString();
  return code.padStart(6, "0");
}

// Vérifie un code à 6 chiffres (tolérance ±1 période de 30 s pour le décalage
// d'horloge). Renvoie le numéro de période utilisé, ou null. L'appelant refuse
// une période déjà utilisée (anti-rejeu).
export function verifyTotp(secret, code, lastStep = null) {
  if (!secret || !/^\d{6}$/.test(String(code || ""))) return null;
  const key = base32Decode(secret);
  const now = Math.floor(Date.now() / 1000 / 30);
  for (const step of [now, now - 1, now + 1]) {
    if (lastStep !== null && lastStep !== undefined && step <= Number(lastStep)) continue;
    const expected = Buffer.from(hotp(key, step));
    if (crypto.timingSafeEqual(expected, Buffer.from(String(code)))) return step;
  }
  return null;
}

export function totpUri(secret, account) {
  const label = encodeURIComponent(`Aux Bonnes Pattes:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent("Aux Bonnes Pattes")}&digits=6&period=30`;
}

// Alerte email à l'administratrice (adresse du compte + email de contact).
// Ne fait jamais échouer l'action qui la déclenche.
export async function alertAdmin(adminEmail, subject, lines) {
  try {
    const { sendSecurityAlertEmail } = await import("./email");
    const s = await query("SELECT contact_email FROM settings LIMIT 1");
    await sendSecurityAlertEmail({ to: [adminEmail, s.rows[0]?.contact_email], subject, lines });
  } catch (e) {
    console.error("Alerte de sécurité non envoyée :", e.message);
  }
}
