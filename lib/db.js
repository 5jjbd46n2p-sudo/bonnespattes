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
      // Neon endort la base après quelques minutes sans activité et coupe alors les connexions
      // inactives : on les ferme nous-mêmes avant, et on ne laisse jamais une connexion morte
      // planter la fonction (sans écouteur, l'événement « error » du pool est fatal).
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 15_000,
      keepAlive: true,
    });
    pool.on("error", (e) => console.warn("Connexion inactive fermée par la base :", e.message));
  }
  return pool;
}

// Erreurs de connexion (base réveillée après une pause, connexion coupée) : une seule nouvelle tentative.
const isConnectionError = (e) =>
  /Connection terminated|ECONNRESET|ECONNREFUSED|terminating connection|server closed the connection|Client has encountered a connection error|timeout exceeded when trying to connect/i.test(
    String(e?.message || "")
  );

export async function query(text, params) {
  for (let attempt = 0; ; attempt++) {
    let client;
    try {
      client = await getPool().connect();
      const result = await client.query(text, params);
      client.release();
      return result;
    } catch (e) {
      if (client) client.release(isConnectionError(e) ? e : undefined);
      if (attempt === 0 && isConnectionError(e)) continue;
      throw e;
    }
  }
}

export async function tx(fn) {
  // Connexion + BEGIN : on réessaie une fois si la connexion était morte (rien n'a encore été écrit).
  let client;
  for (let attempt = 0; ; attempt++) {
    try {
      client = await getPool().connect();
      await client.query("BEGIN");
      break;
    } catch (e) {
      if (client) client.release(e);
      client = undefined;
      if (attempt === 0 && isConnectionError(e)) continue;
      throw e;
    }
  }
  try {
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
