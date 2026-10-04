// Calcul des tarifs (fonctions pures). `s` = ligne settings (colonnes SQL).
const num = (v, d) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? d : Number(v));
const roundHalf = (x) => Math.round(x * 2) / 2;

// `clientHourlyRate` : tarif horaire (1 h) propre au client. S'il est renseigné
// (> 0), toute la grille des réglages est mise à l'échelle dans le même rapport
// (ex. 15 / 18 / 22 € avec un tarif client de 25 €/h → 17 / 20,5 / 25 €).
export function basePrice(minutes, s = {}, clientHourlyRate = 0) {
  let r30 = num(s.rate_30, 15);
  let r45 = num(s.rate_45, 18);
  let r60 = num(s.rate_60, 22);
  const custom = Number(clientHourlyRate);
  if (Number.isFinite(custom) && custom > 0 && r60 > 0) {
    const k = custom / r60;
    r30 = roundHalf(r30 * k);
    r45 = roundHalf(r45 * k);
    r60 = custom;
  }
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

