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

// Jours de la semaine en français, numérotés comme en ISO-8601 (1 = lundi ... 7 = dimanche).
export const WEEKDAYS_FR = [
  { value: 1, short: "L", label: "Lundi" },
  { value: 2, short: "M", label: "Mardi" },
  { value: 3, short: "M", label: "Mercredi" },
  { value: 4, short: "J", label: "Jeudi" },
  { value: 5, short: "V", label: "Vendredi" },
  { value: 6, short: "S", label: "Samedi" },
  { value: 7, short: "D", label: "Dimanche" },
];

// Jour de la semaine (1 = lundi ... 7 = dimanche) d'une date "YYYY-MM-DD".
export function isoWeekday(dateStr) {
  const day = new Date(`${dateStr}T00:00:00`).getDay(); // 0 (dimanche) .. 6 (samedi)
  return day === 0 ? 7 : day;
}

// Construit la liste des dates ("YYYY-MM-DD") d'une récurrence "semaine type" :
// à partir de startDate, une visite est planifiée chaque semaine sur les jours
// choisis (weekdays, 1 = lundi ... 7 = dimanche), pendant weeksCount semaines.
// La semaine de départ compte comme la 1ère semaine (elle peut donc contenir
// moins de jours que les suivantes si startDate n'est pas un lundi) ; aucune
// date antérieure à startDate n'est jamais renvoyée.
export function generateWeeklyRecurrenceDates(startDate, weekdays, weeksCount) {
  if (!startDate || !weekdays?.length || !weeksCount) return [];
  const startWeekday = isoWeekday(startDate);
  const weekStart = new Date(`${startDate}T00:00:00`);
  weekStart.setDate(weekStart.getDate() - (startWeekday - 1)); // lundi de la semaine de départ

  const sortedDays = [...new Set(weekdays)].sort((a, b) => a - b);
  const dates = [];
  for (let w = 0; w < weeksCount; w++) {
    for (const day of sortedDays) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + w * 7 + (day - 1));
      const iso = d.toISOString().slice(0, 10);
      if (iso >= startDate) dates.push(iso);
    }
  }
  return dates.sort();
}
