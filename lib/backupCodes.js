import crypto from "crypto";

// Codes de secours de la double authentification (spec sécurité lot 0, §2) :
// 10 codes à usage unique, affichés une seule fois, stockés hachés.
export const BACKUP_CODE_COUNT = 10;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans I, O, 0, 1 (ambigus)

function randomChunk(n) {
  let out = "";
  for (let i = 0; i < n; i++) out += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return out;
}

export function generateBackupCodes(n = BACKUP_CODE_COUNT) {
  const codes = new Set();
  while (codes.size < n) codes.add(`${randomChunk(4)}-${randomChunk(4)}`);
  return [...codes];
}

export function normalizeBackupCode(input) {
  return String(input || "").toUpperCase().replace(/[\s-]/g, "");
}

export function hashBackupCode(code) {
  return crypto.createHash("sha256").update(normalizeBackupCode(code)).digest("hex");
}

export function looksLikeBackupCode(input) {
  const n = normalizeBackupCode(input);
  return n.length === 8 && [...n].every((c) => ALPHABET.includes(c));
}
