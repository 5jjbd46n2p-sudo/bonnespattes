import { NextResponse } from "next/server";
import { query, tx } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  renderContract, newToken, hashToken, sha256Hex, missingContractSettings, CONTRACT_VALIDITY_DAYS,
} from "@/lib/contract";
import { sendContractEmail } from "@/lib/email";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  const { rows } = await query(
    `SELECT id, client_id, version, status, sent_to, sent_at, expires_at, signed_at, signer_name, created_at
     FROM contract_signatures WHERE client_id = $1 ORDER BY created_at DESC`,
    [id]
  );
  return NextResponse.json({ signatures: rows });
}

export async function POST(_req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });

  const clientRes = await query("SELECT * FROM clients WHERE id = $1", [id]);
  const client = clientRes.rows[0];
  if (!client) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  const email = String(client.email || "").trim();
  if (!email) {
    return NextResponse.json({ error: "Ce client n'a pas d'adresse email : ajoutez-la avant d'envoyer le contrat." }, { status: 400 });
  }

  const settingsRes = await query("SELECT * FROM settings LIMIT 1");
  const settings = settingsRes.rows[0] || {};
  const missing = missingContractSettings(settings);
  if (missing.length) {
    return NextResponse.json(
      { error: `Réglages incomplets pour le contrat. Champs à renseigner : ${missing.join(", ")}.` },
      { status: 400 }
    );
  }
  const petsRes = await query("SELECT * FROM pets WHERE client_id = $1 ORDER BY created_at", [id]);
  const content = renderContract({ settings, client, pets: petsRes.rows });

  const token = newToken();
  const signature = await tx(async (db) => {
    await db.query("UPDATE contract_signatures SET status = 'ANNULE' WHERE client_id = $1 AND status = 'ENVOYE'", [id]);
    const ins = await db.query(
      `INSERT INTO contract_signatures (client_id, token_hash, version, content, content_hash, sent_to, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6, now() + ($7 || ' days')::interval) RETURNING id, expires_at`,
      [id, hashToken(token), Number(settings.contract_version) || 1, content, sha256Hex(content), email, String(CONTRACT_VALIDITY_DAYS)]
    );
    return ins.rows[0];
  });

  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  try {
    await sendContractEmail({
      to: email,
      clientName: `${client.first_name} ${client.last_name}`,
      link: `${base}/contrat/${token}`,
      expiresAt: signature.expires_at,
    });
  } catch (e) {
    await query("UPDATE contract_signatures SET status = 'ANNULE' WHERE id = $1 AND status = 'ENVOYE'", [signature.id]);
    return NextResponse.json({ error: e.message || "Échec de l'envoi de l'email." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
