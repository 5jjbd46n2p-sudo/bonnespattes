// Applique le schéma SQL (lib/schema.sql) sur la base de données définie par DATABASE_URL.
// Utilisation : DATABASE_URL="postgres://..." node scripts/migrate.mjs
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { Pool } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ Variable DATABASE_URL manquante.");
    process.exit(1);
  }
  const sql = readFileSync(join(__dirname, "..", "lib", "schema.sql"), "utf-8");
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("sslmode=") ? undefined : { rejectUnauthorized: false },
  });
  const client = await pool.connect();
  try {
    console.log("⏳ Application du schéma...");
    await client.query(sql);
    console.log("✅ Base de données prête !");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("❌ Erreur pendant la migration :", e);
  process.exit(1);
});
