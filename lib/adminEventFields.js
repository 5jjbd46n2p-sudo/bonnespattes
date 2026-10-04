import { query } from "@/lib/db";
import { cleanText, isUuid } from "@/lib/api";
import { ADMIN_EVENT_KIND_IDS } from "@/lib/adminEvents";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// Valide et nettoie les champs communs (création et modification).
export async function parseEventFields(b) {
  const title = cleanText(b.title, 120);
  const kind = ADMIN_EVENT_KIND_IDS.includes(b.kind) ? b.kind : "AUTRE";
  const start = b.startTime || null;
  const end = b.endTime || null;
  if (!title) return { error: "Donne un titre.", status: 400 };
  if ((start && !TIME_RE.test(start)) || (end && !TIME_RE.test(end))) {
    return { error: "Horaire invalide.", status: 400 };
  }
  const km = b.travelKm === "" || b.travelKm == null ? 0 : Number(b.travelKm);
  const min = b.travelMinutes === "" || b.travelMinutes == null ? 0 : Math.round(Number(b.travelMinutes));
  if (!Number.isFinite(km) || km < 0 || km > 2000 || !Number.isFinite(min) || min < 0 || min > 1440) {
    return { error: "Trajet invalide.", status: 400 };
  }
  let clientId = null;
  if (b.clientId) {
    if (!isUuid(b.clientId)) return { error: "Client invalide.", status: 400 };
    const c = await query("SELECT 1 FROM clients WHERE id = $1", [b.clientId]);
    if (!c.rows[0]) return { error: "Client introuvable.", status: 404 };
    clientId = b.clientId;
  }
  return {
    fields: {
      title,
      kind,
      start,
      end,
      clientId,
      place: cleanText(b.place, 200),
      km: Math.round(km * 10) / 10,
      min,
      notes: cleanText(b.notes, 1000),
    },
  };
}

