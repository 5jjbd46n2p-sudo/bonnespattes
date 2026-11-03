// Logique pure de la page d'accueil publique (testée par tests/landing.test.mjs).

const PRICE_LINES = [
  { key: "rate_30", label: "Visite ou balade, 30 min" },
  { key: "rate_45", label: "Visite ou balade, 45 min" },
  { key: "rate_60", label: "Visite ou balade, 1 h" },
  { key: "rate_day", label: "Garde chez Aurore, la journée" },
];

// Lignes de tarif réglées dans les Réglages ; une ligne sans montant valide n'est pas affichée.
export function priceRows(settings = {}) {
  const rows = [];
  for (const { key, label } of PRICE_LINES) {
    const raw = settings?.[key];
    if (raw === null || raw === undefined || raw === "") continue;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    rows.push({ key, label, amount });
  }
  return rows;
}

// « À partir de » : le moins cher des tarifs à la visite (la journée n'en fait pas partie).
export function fromPrice(rows = []) {
  const visits = rows.filter((r) => r.key !== "rate_day").map((r) => r.amount);
  return visits.length ? Math.min(...visits) : null;
}

export const WHATSAPP_MESSAGE = "Bonjour Aurore, je vous contacte depuis le site Aux Bonnes Pattes.";

// Numéro WhatsApp saisi dans les Réglages → chiffres au format international (sans +).
export function normalizeWhatsapp(input) {
  if (input === null || input === undefined) return { value: null };
  if (typeof input !== "string") return { error: "Numéro WhatsApp invalide." };
  const trimmed = input.trim();
  if (!trimmed) return { value: null };
  const compact = trimmed.replace(/[\s.\-()]/g, "");
  if (!/^\+?\d+$/.test(compact)) return { error: "Numéro WhatsApp invalide." };
  let digits = compact.replace(/^\+/, "");
  if (!compact.startsWith("+") && /^0[1-9]\d{8}$/.test(digits)) digits = `33${digits.slice(1)}`;
  if (digits.length < 8 || digits.length > 15) return { error: "Numéro WhatsApp invalide." };
  return { value: digits };
}

export function whatsappHref(number) {
  const digits = String(number || "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
}
