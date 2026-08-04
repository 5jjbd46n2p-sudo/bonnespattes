export function wazeUrl(address) {
  if (!address || !address.trim()) return null;
  return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
}

export function formatEUR(amount) {
  const n = Number(amount || 0);
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export function formatDateFR(d) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateLongFR(d) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Calcule la durée d'une visite en heures (décimal) à partir de l'heure de début
// et de fin (format "HH:MM" ou "HH:MM:SS"). Renvoie null si le calcul est impossible.
export function computeVisitHours(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const toMinutes = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const diff = toMinutes(endTime) - toMinutes(startTime);
  if (!diff || diff <= 0) return null;
  return Math.round((diff / 60) * 100) / 100;
}

// Ajoute un nombre de jours à une date au format "YYYY-MM-DD" et renvoie le
// résultat dans le même format.
export function addDaysISO(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
