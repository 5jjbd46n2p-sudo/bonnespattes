import crypto from "crypto";
import { query, tx } from "./db";
import { hashPassword } from "./auth";
import { passwordProblem } from "./security";
import { newActivationToken, hashActivationToken, activationExpiry, isActivationUsable } from "./activation";

// Mot de passe que personne ne connaît : le compte existe mais ne permet aucune
// connexion tant que le client n'a pas choisi le sien via le lien d'activation.
async function unusablePasswordHash() {
  return hashPassword(crypto.randomBytes(32).toString("base64url"));
}

// Crée ou réinitialise l'accès d'un client et prépare un lien d'activation.
// `db` : client d'une transaction tx(). Les liens non utilisés précédents sont
// supprimés (seul le dernier envoyé fonctionne). Réinitialiser un accès existant
// ferme aussi ses sessions ouvertes. Renvoie { token, userId, expiresAt }.
export async function issueClientAccess(db, { clientId, email }) {
  const login = String(email).trim().toLowerCase();
  const hash = await unusablePasswordHash();
  const existing = await db.query("SELECT id FROM users WHERE client_id = $1", [clientId]);
  let userId;
  if (existing.rows[0]) {
    userId = existing.rows[0].id;
    await db.query(
      `UPDATE users SET email = $2, password_hash = $3, must_change_password = false,
              session_version = session_version + 1
        WHERE id = $1`,
      [userId, login, hash]
    );
  } else {
    const ins = await db.query(
      "INSERT INTO users (email, password_hash, role, client_id, must_change_password) VALUES ($1,$2,'CLIENT',$3,false) RETURNING id",
      [login, hash, clientId]
    );
    userId = ins.rows[0].id;
  }
  await db.query("DELETE FROM activation_tokens WHERE user_id = $1 AND used_at IS NULL", [userId]);
  const { token, hash: tokenHash } = newActivationToken();
  const expiresAt = activationExpiry();
  await db.query("INSERT INTO activation_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)", [
    userId,
    tokenHash,
    expiresAt,
  ]);
  return { token, userId, expiresAt };
}

// Lien encore valable ? (page /activer/[jeton], sans le consommer)
export async function findUsableActivation(token) {
  const { rows } = await query(
    `SELECT a.expires_at, a.used_at, u.email FROM activation_tokens a JOIN users u ON u.id = a.user_id
      WHERE a.token_hash = $1`,
    [hashActivationToken(token)]
  );
  return isActivationUsable(rows[0]) ? { email: rows[0].email } : null;
}

// Active le compte : vérifie le jeton (non utilisé, non expiré), applique les
// règles du mot de passe, consomme le jeton et enregistre le mot de passe dans
// la même transaction. Un jeton ne sert qu'une fois, même avec deux envois
// simultanés (verrou FOR UPDATE + condition used_at IS NULL).
// Renvoie { user } ou { error: "invalid" | <message de règle de mot de passe> }.
export async function activateWithToken(token, password, { transaction = tx, hash = hashPassword } = {}) {
  return transaction(async (db) => {
    const { rows } = await db.query(
      `SELECT a.id, a.user_id, a.expires_at, a.used_at, u.email FROM activation_tokens a
         JOIN users u ON u.id = a.user_id
        WHERE a.token_hash = $1 FOR UPDATE OF a`,
      [hashActivationToken(token)]
    );
    const row = rows[0];
    if (!isActivationUsable(row)) return { error: "invalid" };
    const problem = passwordProblem(password, { email: row.email });
    if (problem) return { error: problem };
    const used = await db.query(
      "UPDATE activation_tokens SET used_at = now() WHERE id = $1 AND used_at IS NULL RETURNING id",
      [row.id]
    );
    if (!used.rows[0]) return { error: "invalid" };
    const upd = await db.query(
      `UPDATE users SET password_hash = $2, must_change_password = false, password_changed_at = now(),
              session_version = session_version + 1
        WHERE id = $1 RETURNING *`,
      [row.user_id, await hash(password)]
    );
    return { user: upd.rows[0] };
  });
}
