import crypto from "crypto";

// Chiffrement des données sensibles stockées en base (secret de double
// authentification, accès aux logements). AES-256-GCM : chiffré ET authentifié
// (toute modification de la valeur en base est détectée au déchiffrement).
// Format : v1:<iv>:<tag>:<données>, en base64. Le préfixe de version permettra
// une rotation de clé plus tard sans casser les valeurs existantes.
// La clé (DATA_ENCRYPTION_KEY, 32 octets en base64) est distincte de JWT_SECRET.

const VERSION = "v1";

function getKey() {
  const raw = process.env.DATA_ENCRYPTION_KEY || "";
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("DATA_ENCRYPTION_KEY manquante ou invalide.");
  return key;
}

export function encrypt(plain) {
  if (typeof plain !== "string") throw new Error("Valeur à chiffrer invalide.");
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), tag.toString("base64"), data.toString("base64")].join(":");
}

export function decrypt(value) {
  const parts = String(value || "").split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) throw new Error("Valeur chiffrée invalide.");
  const key = getKey();
  const [, iv, tag, data] = parts.map((p, i) => (i === 0 ? p : Buffer.from(p, "base64")));
  if (iv.length !== 12 || tag.length !== 16) throw new Error("Valeur chiffrée invalide.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function isEncrypted(value) {
  return typeof value === "string" && value.startsWith(`${VERSION}:`);
}
