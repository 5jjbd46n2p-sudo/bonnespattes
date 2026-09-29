import { randomInt } from "node:crypto";

// 8 caractères A-Z (sans I, O) et 2-9 (sans 0, 1) : pas d'ambiguïté à l'oral.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReferralCode() {
  let code = "";
  for (let i = 0; i < 8; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

export function normalizeReferralCode(raw) {
  const code = String(raw ?? "").trim().toUpperCase();
  return /^[A-Z2-9]{8}$/.test(code) && !/[IO]/.test(code) ? code : null;
}

// `db` : client transactionnel (pg) ou objet { query }. Renvoie le code du client
// (le crée s'il n'existe pas encore).
export async function ensureReferralCode(db, clientId) {
  const cur = await db.query("SELECT referral_code FROM clients WHERE id = $1", [clientId]);
  if (!cur.rows[0]) return null;
  if (cur.rows[0].referral_code) return cur.rows[0].referral_code;
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateReferralCode();
    // SAVEPOINT : une collision d'unicité ne doit pas invalider la transaction englobante.
    await db.query("SAVEPOINT ref_code");
    try {
      const { rows } = await db.query(
        "UPDATE clients SET referral_code = $1 WHERE id = $2 AND referral_code IS NULL RETURNING referral_code",
        [code, clientId]
      );
      await db.query("RELEASE SAVEPOINT ref_code");
      if (rows[0]) return rows[0].referral_code;
      const again = await db.query("SELECT referral_code FROM clients WHERE id = $1", [clientId]);
      return again.rows[0]?.referral_code || null;
    } catch (e) {
      await db.query("ROLLBACK TO SAVEPOINT ref_code");
      if (e.code !== "23505") throw e;
    }
  }
  throw new Error("Impossible de générer un code de parrainage unique.");
}
