import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/api";

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function geocode(address) {
  const data = await fetchJson(
    `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`
  );
  const coords = data?.features?.[0]?.geometry?.coordinates;
  if (!coords) return null;
  return { lon: coords[0], lat: coords[1] };
}

export async function POST(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  const clientRes = await query("SELECT id, address FROM clients WHERE id = $1", [id]);
  const client = clientRes.rows[0];
  if (!client) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  const settingsRes = await query("SELECT business_address FROM settings LIMIT 1");
  const businessAddress = (settingsRes.rows[0]?.business_address || "").trim();

  if (!businessAddress) {
    return NextResponse.json(
      { error: "Ton adresse professionnelle n'est pas renseignée. Ajoute-la dans les Réglages." },
      { status: 400 }
    );
  }
  if (!(client.address || "").trim()) {
    return NextResponse.json({ error: "Ce client n'a pas d'adresse renseignée." }, { status: 400 });
  }

  try {
    const [from, to] = await Promise.all([geocode(businessAddress), geocode(client.address.trim())]);
    if (!from) {
      return NextResponse.json(
        { error: "Adresse professionnelle introuvable. Vérifie-la dans les Réglages." },
        { status: 422 }
      );
    }
    if (!to) {
      return NextResponse.json({ error: "Adresse du client introuvable. Vérifie-la sur sa fiche." }, { status: 422 });
    }
    const route = await fetchJson(
      `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`
    );
    const r = route?.routes?.[0];
    if (!r) {
      return NextResponse.json({ error: "Aucun itinéraire trouvé entre les deux adresses." }, { status: 422 });
    }
    const distanceKm = Math.round((r.distance / 1000) * 10) / 10;
    const travelMinutes = Math.max(1, Math.round(r.duration / 60));
    await query("UPDATE clients SET distance_km = $1, travel_minutes = $2 WHERE id = $3", [
      distanceKm,
      travelMinutes,
      id,
    ]);
    return NextResponse.json({ distanceKm, travelMinutes });
  } catch (e) {
    console.error(e);
    const timeout = e?.name === "TimeoutError" || e?.name === "AbortError";
    return NextResponse.json(
      {
        error: timeout
          ? "Le service de calcul d'itinéraire met trop de temps à répondre. Réessaie dans un instant."
          : "Impossible de calculer la distance pour le moment. Réessaie plus tard ou saisis-la à la main.",
      },
      { status: 502 }
    );
  }
}
