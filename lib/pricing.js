// Calcul des tarifs (fonctions pures). `s` = ligne settings (colonnes SQL).
const num = (v, d) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? d : Number(v));
const roundHalf = (x) => Math.round(x * 2) / 2;

export function basePrice(minutes, s = {}) {
  const r30 = num(s.rate_30, 15);
  const r45 = num(s.rate_45, 18);
  const r60 = num(s.rate_60, 22);
  const m = Number(minutes);
  if (m === 30) return r30;
  if (m === 45) return r45;
  if (m === 60) return r60;
  if (!m || m <= 0) return r30;
  return Math.max(r30, roundHalf((r60 * m) / 60));
}

export function travelFee({ distanceKm, travelMinutes } = {}, s = {}) {
  if (distanceKm === null || distanceKm === undefined || Number.isNaN(Number(distanceKm))) return 0;
  const kmAR = 2 * Number(distanceKm);
  if (kmAR <= num(s.travel_free_km, 4)) return 0;
  const kmRate = num(s.km_rate, 0.5);
  const share = num(s.travel_time_share, 0.5);
  const rate60 = num(s.rate_60, 22);
  const timeCost = ((2 * num(travelMinutes, 0)) / 60) * rate60 * share;
  return roundHalf(kmAR * kmRate + timeCost);
}

