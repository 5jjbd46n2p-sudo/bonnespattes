// Mot de passe provisoire (14 caractères sans ambiguïté O/0, l/1), généré avec
// l'aléa cryptographique du navigateur ou de Node. Utilisable côté client.
const CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateTemporaryPassword(length = 14) {
  const bytes = globalThis.crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (n) => CHARS[n % CHARS.length]).join("");
}
