// Demande de devis (garde longue ou régulière) : validation stricte + estimation
// indicative. Fonctions pures, partagées par l'API, les emails et l'admin.
import { basePrice } from "@/lib/pricing";

export const QUOTE_TYPES = ["PONCTUELLE", "REGULIERE"];
export const QUOTE_MINUTES = [30, 45, 60];
export const WEEKDAY_LABELS = { 1: "lundi", 2: "mardi", 3: "mercredi", 4: "jeudi", 5: "vendredi", 6: "samedi", 7: "dimanche" };
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SPAN_DAYS = 366;
const DAY_MS = 86400000;

function parseIso(s) {
  if (typeof s !== "string" || !ISO_RE.test(s)) return null;
  const t = Date.parse(`${s}T00:00:00Z`);
  if (Number.isNaN(t)) return null;
  // Rejette 2026-02-31 (normalisé par Date).
  return new Date(t).toISOString().slice(0, 10) === s ? t : null;
}

const text = (v, max) => {
  if (v === undefined || v === null) return "";
  if (typeof v !== "string") return null;
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max + 1);
};

// Retourne { quote } ou { error }.
export function validateQuote(q, now = Date.now()) {
  const bad = (error) => ({ error });
  if (!q || typeof q !== "object" || Array.isArray(q)) return bad("Demande de devis invalide.");
  if (!QUOTE_TYPES.includes(q.type)) return bad("Type de garde invalide.");
  const start = parseIso(q.startDate);
  if (start === null) return bad("Date de début invalide.");
  const today = Math.floor(now / DAY_MS) * DAY_MS;
  if (start < today - DAY_MS) return bad("La date de début est passée.");
  if (start > today + 730 * DAY_MS) return bad("Date de début trop lointaine.");

  const perDay = Number(q.perDay);
  if (!Number.isInteger(perDay) || perDay < 1 || perDay > 3) return bad("Nombre de passages par jour invalide (1 à 3).");
  const minutes = Number(q.minutes);
  if (!QUOTE_MINUTES.includes(minutes)) return bad("Durée d'un passage invalide (30, 45 ou 60 minutes).");
  const needs = text(q.needs, 1500);
  if (needs === null || needs.length > 1500) return bad("Besoins particuliers trop longs (1500 caractères maximum).");

  const out = { type: q.type, startDate: q.startDate, perDay, minutes, needs };
  if (q.type === "PONCTUELLE") {
    const end = parseIso(q.endDate);
    if (end === null) return bad("Date de fin invalide.");
    if (end < start) return bad("La date de fin doit être postérieure ou égale à la date de début.");
    if ((end - start) / DAY_MS + 1 > MAX_SPAN_DAYS) return bad("Période trop longue (366 jours maximum).");
    out.endDate = q.endDate;
  } else {
    if (!Array.isArray(q.weekdays) || q.weekdays.length < 1 || q.weekdays.length > 7) return bad("Choisissez au moins un jour de la semaine.");
    const days = q.weekdays.map(Number);
    if (days.some((d) => !Number.isInteger(d) || d < 1 || d > 7) || new Set(days).size !== days.length) {
      return bad("Jours de la semaine invalides.");
    }
    out.weekdays = [...days].sort((a, b) => a - b);
    if (q.openEnded === true) {
      out.openEnded = true;
      out.weeks = null;
    } else {
      const weeks = Number(q.weeks);
      if (!Number.isInteger(weeks) || weeks < 1 || weeks > 52) return bad("Nombre de semaines invalide (1 à 52).");
      out.openEnded = false;
      out.weeks = weeks;
    }
  }
  return { quote: out };
}

// Estimation indicative HORS déplacement. Jamais présentée comme prix ferme.
export function estimateQuote(quote, settings = {}) {
  if (!quote || typeof quote !== "object") return null;
  const unit = basePrice(quote.minutes, settings);
  let visits;
  let perWeek = null;
  if (quote.type === "PONCTUELLE") {
    const s = parseIso(quote.startDate);
    const e = parseIso(quote.endDate);
    if (s === null || e === null || e < s) return null;
    visits = ((e - s) / DAY_MS + 1) * quote.perDay;
  } else {
    if (!Array.isArray(quote.weekdays)) return null;
    perWeek = quote.weekdays.length * quote.perDay;
    visits = quote.openEnded || !quote.weeks ? null : perWeek * quote.weeks;
  }
  return {
    unit,
    visits,
    perWeek,
    total: visits === null ? null : unit * visits,
    weekly: perWeek === null ? null : unit * perWeek,
  };
}

const eur = (n) => `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;
const dateFr = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// Lignes lisibles [libellé, valeur] pour l'email et l'admin.
export function quoteLines(quote, settings = {}) {
  if (!quote) return [];
  const lines = [["Type", quote.type === "PONCTUELLE" ? "Période ponctuelle" : "Visites régulières"], ["Début", dateFr(quote.startDate)]];
  if (quote.type === "PONCTUELLE") lines.push(["Fin", dateFr(quote.endDate)]);
  else {
    lines.push(["Jours", (quote.weekdays || []).map((d) => WEEKDAY_LABELS[d]).join(", ")]);
    lines.push(["Durée", quote.openEnded ? "Sans date de fin" : `${quote.weeks} semaine${quote.weeks > 1 ? "s" : ""}`]);
  }
  lines.push(["Passages par jour", String(quote.perDay)], ["Durée d'un passage", `${quote.minutes} min`]);
  if (quote.needs) lines.push(["Besoins particuliers", quote.needs]);
  return lines;
}

// Phrase d'estimation, toujours libellée « estimation hors déplacement ».
export function estimateText(quote, settings = {}) {
  const est = estimateQuote(quote, settings);
  if (!est) return "";
  const base = `${eur(est.unit)} par passage de ${quote.minutes} min`;
  if (est.total === null) {
    return `Estimation indicative hors déplacement : ${base} x ${est.perWeek} passage${est.perWeek > 1 ? "s" : ""} par semaine, soit environ ${eur(est.weekly)} par semaine (sans date de fin).`;
  }
  const detail = quote.type === "REGULIERE" ? `${est.perWeek} passages par semaine x ${quote.weeks} semaine${quote.weeks > 1 ? "s" : ""}` : `${est.visits} passage${est.visits > 1 ? "s" : ""}`;
  return `Estimation indicative hors déplacement : ${base} x ${detail} (${est.visits} au total), soit environ ${eur(est.total)}.`;
}
