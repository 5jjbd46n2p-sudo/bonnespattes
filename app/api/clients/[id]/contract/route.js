import { NextResponse } from "next/server";
import { query, tx } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  renderContract, newToken, hashToken, sha256Hex, missingContractSettings, CONTRACT_VALIDITY_DAYS,
} from "@/lib/contract";
import { sendContractEmail, getEmailDeliveryStatus } from "@/lib/email";
import { isUuid } from "@/lib/api";


export async function GET(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });

  // ?delivery=1 : état de remise du dernier email de contrat (consulté chez Resend).
  if (new URL(req.url).searchParams.get("delivery")) {
    let delivery = null;
    try {
      const { rows } = await query(
        `SELECT email_id FROM contract_signatures
          WHERE client_id = $1 AND status = 'ENVOYE' AND email_id IS NOT NULL
          ORDER BY created_at DESC LIMIT 1`,
        [id]
      );
      if (rows[0]) delivery = await getEmailDeliveryStatus(rows[0].email_id);
    } catch {
      // colonne email_id pas encore migrée : pas de suivi
    }
    return NextResponse.json({ delivery });
  }

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
  if (!isUuid(id)) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });

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

  // Client avec un espace client : il signe après connexion. Sinon : lien par email + code.
  const loginRes = await query("SELECT 1 FROM users WHERE client_id = $1 AND role = 'CLIENT' LIMIT 1", [id]);
  const inAccount = loginRes.rows.length > 0;

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
    const emailId = await sendContractEmail({
      to: email,
      clientName: `${client.first_name} ${client.last_name}`,
      link: inAccount ? `${base}/login` : `${base}/contrat/${token}`,
      expiresAt: signature.expires_at,
      inAccount,
    });
    if (typeof emailId === "string") {
      // Suivi de remise : sans la colonne email_id (migration non appliquée), l'envoi reste valable.
      await query("UPDATE contract_signatures SET email_id = $2 WHERE id = $1", [signature.id, emailId]).catch(() => {});
    }
  } catch (e) {
    console.error("Envoi du contrat échoué :", e?.message);
    await query("UPDATE contract_signatures SET status = 'ANNULE' WHERE id = $1 AND status = 'ENVOYE'", [signature.id]);
    return NextResponse.json({ error: "Échec de l'envoi de l'email, réessaie plus tard." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, mode: inAccount ? "account" : "email", sentTo: email });
}
