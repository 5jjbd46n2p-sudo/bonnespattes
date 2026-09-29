// Crée (ou met à jour) le compte administrateur principal.
// Utilisation : DATABASE_URL="postgres://..." node scripts/create-admin.mjs email@exemple.fr motdepasse
// Sert aussi de procédure de secours (téléphone perdu) : réinitialise le mot de
// passe, désactive la double authentification et ferme toutes les sessions.
// À réactiver ensuite dans Réglages > Sécurité.
import { Pool } from "pg";
import bcrypt from "bcryptjs";

async function main() {
  const [, , email, password] = process.argv;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ Variable DATABASE_URL manquante.");
    process.exit(1);
  }
  if (!email || !password) {
    console.error("Utilisation : node scripts/create-admin.mjs email@exemple.fr motdepasse");
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("❌ Mot de passe trop court : 12 caractères minimum.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("sslmode=") ? undefined : { rejectUnauthorized: true },
  });
  const client = await pool.connect();
  try {
    const hash = await bcrypt.hash(password, 12);
    const existing = await client.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (existing.rows[0]) {
      await client.query(
        `UPDATE users SET password_hash = $1, role = 'ADMIN', session_version = session_version + 1,
                totp_enabled = false, totp_secret = NULL, totp_last_step = NULL, must_change_password = false
          WHERE email = $2`,
        [hash, email.toLowerCase()]
      );
      await client.query("DELETE FROM rate_limit_hits WHERE bucket LIKE 'login%' OR bucket LIKE 'mfa%'");
      console.log(`✅ Mot de passe mis à jour pour l'admin ${email}.`);
      console.log("⚠️  Double authentification désactivée : réactive-la dans Réglages > Sécurité.");
    } else {
      await client.query(
        "INSERT INTO users (email, password_hash, role) VALUES ($1,$2,'ADMIN')",
        [email.toLowerCase(), hash]
      );
      console.log(`✅ Compte admin créé pour ${email}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("❌ Erreur :", e);
  process.exit(1);
});
