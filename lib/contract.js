import crypto from "crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { DEFAULT_CONTRACT_TEMPLATE, CONTRACT_CHECKBOXES } from "./contractTemplate";

export const CONTRACT_VALIDITY_DAYS = 14;
export const OTP_MAX_SENT = 5;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_TTL_MINUTES = 10;

const MISSING = "[à compléter]";

const REQUIRED_SETTINGS = [
  ["business_name", "nom de l'activité"],
  ["siret", "SIRET"],
  ["contact_email", "email de contact"],
];
// Assurance et médiateur ne bloquent pas l'envoi : sans assurance, la phrase qui
// l'affirme est retirée du contrat (jamais d'affirmation fausse) ; sans médiateur
// désigné, un texte d'attente renvoie vers la liste officielle. À renseigner dès que possible.
const MEDIATOR_FALLBACK =
  "dont les coordonnées sont communiquées au Client sur simple demande (liste officielle des médiateurs : mediation-conso.fr)";

// Champs obligatoires absents des réglages (libellés lisibles)
export function missingContractSettings(settings) {
  return REQUIRED_SETTINGS.filter(([k]) => !String(settings?.[k] ?? "").trim()).map(([, label]) => label);
}

export function renderContract({ settings, client, pets }) {
  const s = settings || {};
  const c = client || {};
  let template = s.contract_template && String(s.contract_template).trim() ? s.contract_template : DEFAULT_CONTRACT_TEMPLATE;
  if (!String(s.insurance_info ?? "").trim()) {
    template = template
      .replace(/Le Prestataire déclare être couvert[^.]*\{\{\s*insurance_info\s*\}\}\.\s*/, "")
      .replace("Sa responsabilité est engagée", "La responsabilité du Prestataire est engagée");
  }
  const rate = Number(s.default_tva_rate ?? 0);
  const animals = (pets || [])
    .map((p) => {
      const kind = [p.species, p.breed].filter((x) => x && String(x).trim()).join(", ");
      return [p.name, kind, p.notes && String(p.notes).trim()].filter(Boolean).join(" - ").replace(/\s*\n\s*/g, " ");
    })
    .join("\n");
  const val = (v) => (v !== null && v !== undefined && String(v).trim() ? String(v).trim() : MISSING);
  const vars = {
    business_name: val(s.business_name),
    legal_form: val(s.legal_form),
    siret: val(s.siret),
    business_address: val(s.business_address),
    contact_email: val(s.contact_email),
    client_name: val(`${c.first_name || ""} ${c.last_name || ""}`),
    client_address: val(c.address),
    client_email: val(c.email),
    client_phone: val(c.phone),
    insurance_info: val(s.insurance_info),
    mediator_info: String(s.mediator_info ?? "").trim() || MEDIATOR_FALLBACK,
    animals: animals || "Aucun animal renseigné.",
    tva_mention: rate === 0 || !Number.isFinite(rate)
      ? "TVA non applicable, art. 293 B du CGI."
      : `Prix TTC, TVA au taux de ${String(rate).replace(".", ",")} %.`,
  };
  // Remplacement en une passe : une valeur contenant {{...}} n'est pas réinterprétée
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, k) => (k in vars ? vars[k] : m));
}

export function sha256Hex(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

export function newToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(token) {
  return sha256Hex(String(token));
}

export function generateOtp() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

export function hashOtp(tokenHash, code) {
  return sha256Hex(`${tokenHash}${code}`);
}

// Comparaison à temps constant de deux chaînes hexadécimales
export function safeEqualHex(a, b) {
  try {
    const x = Buffer.from(String(a), "hex");
    const y = Buffer.from(String(b), "hex");
    return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y);
  } catch {
    return false;
  }
}

export function getClientIp(req) {
  const xff = req.headers.get("x-forwarded-for");
  return (xff ? xff.split(",")[0].trim() : req.headers.get("x-real-ip") || "").slice(0, 100) || null;
}

const REPLACEMENTS = {
  " ": " ", " ": " ", " ": " ", "‑": "-", "−": "-", "→": "->", "≤": "<=", "≥": ">=",
};

function fmtDateParis(d) {
  return new Date(d).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export async function buildContractPdf(signature, client) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const supported = new Set(regular.getCharacterSet());
  const clean = (t) =>
    Array.from(String(t ?? "").replace(/\r/g, ""))
      .map((ch) => {
        if (ch === "\n" || supported.has(ch.codePointAt(0))) return ch;
        return REPLACEMENTS[ch] ?? "?";
      })
      .join("");

  const W = 595.28, H = 841.89, M = 56, maxW = W - 2 * M;
  const ink = rgb(0.12, 0.1, 0.08);
  let page = pdf.addPage([W, H]);
  let y = H - M;

  const newPage = () => { page = pdf.addPage([W, H]); y = H - M; };
  const wrap = (text, font, size) => {
    const out = [];
    for (const para of clean(text).split("\n")) {
      if (!para.trim()) { out.push(""); continue; }
      let line = "";
      for (const word of para.split(/ +/)) {
        const test = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(test, size) <= maxW) { line = test; continue; }
        if (line) out.push(line);
        // mot plus long qu'une ligne : coupe par caractères
        let chunk = "";
        for (const ch of word) {
          if (font.widthOfTextAtSize(chunk + ch, size) > maxW) { out.push(chunk); chunk = ch; } else chunk += ch;
        }
        line = chunk;
      }
      out.push(line);
    }
    return out;
  };
  const write = (text, { font = regular, size = 10.5, gap = 0, before = 0 } = {}) => {
    const lh = size * 1.35;
    y -= before;
    for (const line of wrap(text, font, size)) {
      if (y - lh < M) newPage();
      y -= lh;
      if (line) page.drawText(line, { x: M, y, size, font, color: ink });
    }
    y -= gap;
  };

  const lines = String(signature.content || "").replace(/\r/g, "").split("\n");
  let first = true;
  for (const raw of lines) {
    if (first && raw.trim()) {
      write(raw.trim(), { font: bold, size: 16, gap: 8 });
      first = false;
    } else if (raw.startsWith("## ")) {
      write(raw.slice(3).trim(), { font: bold, size: 12, before: 8, gap: 2 });
    } else if (!raw.trim()) {
      y -= 4;
    } else {
      write(raw, { gap: 1 });
    }
  }

  // Page de preuve de signature
  newPage();
  write("Preuve de signature électronique", { font: bold, size: 16, gap: 10 });
  const signed = signature.status === "SIGNE" && signature.signed_at;
  const cb = signature.checkboxes && typeof signature.checkboxes === "object" ? signature.checkboxes : {};
  const rows = [
    ["Statut", signed ? "Signé" : "Non signé"],
    ["Signataire", signature.signer_name || "-"],
    ["Date et heure de signature (Europe/Paris)", signed ? fmtDateParis(signature.signed_at) : "-"],
    ["Adresse IP", signature.signer_ip || "-"],
    ["Adresse e-mail (code à usage unique envoyé à)", signature.sent_to || client?.email || "-"],
    ["Version du contrat", String(signature.version)],
    ["Empreinte SHA-256 du texte signé", signature.content_hash || sha256Hex(signature.content || "")],
    ["Contact d'urgence", signature.emergency_contact || "-"],
    ["Vétérinaire", signature.vet_info || "-"],
  ];
  for (const [k, v] of rows) {
    write(k, { font: bold, size: 10 });
    write(v, { size: 10.5, gap: 5 });
  }
  write("Cases cochées", { font: bold, size: 10, before: 4 });
  for (const item of CONTRACT_CHECKBOXES) {
    write(`[${cb[item.id] ? "x" : " "}] ${item.label}`, { size: 10, gap: 3 });
  }

  return pdf.save();
}

export function pdfResponse(bytes, filename) {
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
