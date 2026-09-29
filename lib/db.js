import { Pool } from "pg";

// Réutilise la connexion entre les invocations de fonctions serverless (Vercel)
let pool;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL manquant. Ajoute la variable d'environnement DATABASE_URL (chaîne de connexion Neon/Postgres)."
      );
    }
    pool = new Pool({
      connectionString,
      // Connexion chiffrée ET certificat du serveur vérifié (sinon une
      // interception réseau pourrait lire les données des clients).
      ssl: connectionString.includes("sslmode=") ? undefined : { rejectUnauthorized: true },
      max: 5,
    });
  }
  return pool;
}

export async function query(text, params) {
  const client = await getPool().connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export async function tx(fn) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
