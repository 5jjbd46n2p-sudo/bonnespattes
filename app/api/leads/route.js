import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sendLeadEmails } from "@/lib/email";
import { normalizeReferralCode } from "@/lib/referral";
import { validateQuote } from "@/lib/quote";
import { readJson } from "@/lib/api";
import { clientIp, hashKey } from "@/lib/security";

const STATUSES = ["NOUVEAU", "CONTACTE", "CLIENT", "SANS_SUITE"];
const SERVICES = ["VISITE", "PROMENADE", "LES_DEUX"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_PER_HOUR = 3;

const clean = (v, max) => {
  if (v === undefined || v === null) return "";
  if (typeof v !== "string") return null;
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max + 1);
};

// Empreinte non réversible de l'IP (limite anti-spam), même calcul que les autres limites
const ipHash = (req) => hashKey(clientIp(req));

// Public : dépôt d'une demande de rendez-vous.
export async function POST(req) {
  const body = await readJson(req);

  // Champ piège : un humain ne le remplit pas. On répond « ok » sans rien enregistrer.
  if (body.website !== undefined && body.website !== null && String(body.website).trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = clean(body.name, 100);
  const email = clean(body.email, 200)?.toLowerCase();
  const phone = clean(body.phone, 30);
  const commune = clean(body.commune, 100);
  const animals = clean(body.animals, 300);
  const message = clean(body.message, 2000);
  const service = body.service === undefined || body.service === null || body.service === "" ? null : body.service;

  if ([name, email, phone, commune, animals, message].some((v) => v === null)) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (name.length < 2 || name.length > 100) {
    return NextResponse.json({ error: "Merci d'indiquer votre nom." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  }
  if (phone.length > 30 || (phone && !/^[0-9+().\s-]{6,30}$/.test(phone))) {
    return NextResponse.json({ error: "Numéro de téléphone invalide." }, { status: 400 });
  }
  if (commune.length > 100 || animals.length > 300) {
    return NextResponse.json({ error: "Un des champs est trop long." }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: "Message trop long (2000 caractères maximum)." }, { status: 400 });
  }
  if (service !== null && !SERVICES.includes(service)) {
    return NextResponse.json({ error: "Service invalide." }, { status: 400 });
  }

  const kind = body.kind === undefined || body.kind === null || body.kind === "" ? "CONTACT" : body.kind;
  if (kind !== "CONTACT" && kind !== "DEVIS") {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  let quote = null;
  if (kind === "DEVIS") {
    const v = validateQuote(body.quote);
    if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
    quote = v.quote;
  }

  try {
    const hash = ipHash(req);
    const recent = await query(
      "SELECT COUNT(*)::int AS n FROM leads WHERE ip_hash = $1 AND created_at > now() - interval '1 hour'",
      [hash]
    );
    if (recent.rows[0].n >= MAX_PER_HOUR) {
      return NextResponse.json(
        { error: "Trop de demandes en peu de temps. Merci de réessayer un peu plus tard." },
        { status: 429 }
      );
    }

    // Code parrain : ignoré sans erreur s'il est inconnu ou mal formé.
    let referralCode = null;
    let referrer = null;
    const code = normalizeReferralCode(body.referralCode ?? body.parrain);
    if (code) {
      const r = await query("SELECT id, first_name FROM clients WHERE upper(referral_code) = $1", [code]);
      if (r.rows[0]) {
        referrer = r.rows[0];
        referralCode = code;
      }
    }

    const ins = await query(
      `INSERT INTO leads (name, email, phone, commune, animals, service, message, referral_code, referrer_client_id, ip_hash, kind, quote)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [name, email, phone || null, commune || null, animals || null, quote ? null : service, message || null, referralCode, referrer?.id || null, hash, kind, quote ? JSON.stringify(quote) : null]
    );

    // Un échec d'email ne fait jamais échouer la demande.
    try {
      const s = await query("SELECT contact_email, rate_30, rate_45, rate_60 FROM settings LIMIT 1");
      await sendLeadEmails({
        lead: { name, email, phone, commune, animals, service, message, kind, quote },
        settings: s.rows[0] || {},
        contactEmail: s.rows[0]?.contact_email || "",
        referrerName: referrer?.first_name || "",
      });
    } catch (e) {
      console.error("Emails de demande non envoyés :", e.message);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur, réessayez plus tard." }, { status: 500 });
  }
}

// Admin : liste des demandes (+ compteur de nouvelles).
export async function GET(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const params = new URL(req.url).searchParams;
  const status = params.get("status");
  if (status && !STATUSES.includes(status)) {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }
  const kindFilter = params.get("kind");
  if (kindFilter && kindFilter !== "CONTACT" && kindFilter !== "DEVIS") {
    return NextResponse.json({ error: "Type invalide." }, { status: 400 });
  }
  const { rows } = await query(
    `SELECT l.id, l.name, l.email, l.phone, l.commune, l.animals, l.service, l.message, l.referral_code,
            l.referrer_client_id, l.kind, l.quote, l.status, l.client_id, l.created_at,
            NULLIF(trim(coalesce(r.first_name,'') || ' ' || coalesce(r.last_name,'')), '') AS referrer_name
     FROM leads l LEFT JOIN clients r ON r.id = l.referrer_client_id
     WHERE ($1::text IS NULL OR l.status = $1) AND ($2::text IS NULL OR l.kind = $2)
     ORDER BY l.created_at DESC LIMIT 500`,
    [status || null, kindFilter || null]
  );
  const cnt = await query("SELECT COUNT(*)::int AS n FROM leads WHERE status = 'NOUVEAU'");
  return NextResponse.json({ leads: rows, newCount: cnt.rows[0].n });
}
