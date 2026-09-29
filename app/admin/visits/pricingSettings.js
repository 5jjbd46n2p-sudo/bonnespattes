import { query } from "@/lib/db";

// Réglages de tarification passés en props au formulaire de visite (nombres,
// clés identiques à la table settings, attendues par lib/pricing.js).
export async function getPricingSettings() {
  const res = await query("SELECT * FROM settings LIMIT 1");
  const r = res.rows[0] || {};
  const n = (v, d) => (v === null || v === undefined || v === "" ? d : Number(v));
  return {
    km_rate: n(r.km_rate, 0.5),
    travel_time_share: n(r.travel_time_share, 0.5),
    travel_free_km: n(r.travel_free_km, 4),
    rate_30: n(r.rate_30, 15),
    rate_45: n(r.rate_45, 18),
    rate_60: n(r.rate_60, 22),
  };
}
