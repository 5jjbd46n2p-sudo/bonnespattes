import crypto from "crypto";

// Sceau d'intégrité d'un contrat signé (spec sécurité lot 0, §1) : empreinte
// SHA-256 du dossier complet de signature, calculée à la signature et
// recalculée à chaque rendu du PDF. Une seule implémentation pour les deux.

// Horodatage de signature en UTC, au format exact stocké en base (microsecondes).
// À sélectionner avec chaque ligne dont on calcule ou vérifie le sceau, pour ne
// pas dépendre de la conversion en Date de JavaScript (millisecondes).
export const SIGNED_AT_UTC_SQL =
  `to_char(signed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS signed_at_utc`;

const SEALED_FIELDS = [
  "id",
  "client_id",
  "version",
  "content",
  "content_hash",
  "signer_name",
  "signer_ip",
  "signer_user_agent",
  "checkboxes",
  "emergency_contact",
  "vet_info",
];

// JSON aux clés triées récursivement, sans espaces (forme canonique).
export function canonicalJson(value) {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (typeof value === "object") {
    const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function signedAtOf(sig) {
  if (sig.signed_at_utc) return String(sig.signed_at_utc);
  if (sig.signed_at instanceof Date) return sig.signed_at.toISOString();
  return sig.signed_at ? String(sig.signed_at) : null;
}

export function sealPayload(sig) {
  const payload = {};
  for (const k of SEALED_FIELDS) payload[k] = sig[k] === undefined ? null : sig[k];
  payload.signed_at = signedAtOf(sig);
  return payload;
}

export function computeSeal(sig) {
  return crypto.createHash("sha256").update(canonicalJson(sealPayload(sig)), "utf8").digest("hex");
}

// { ok, legacy } : ok seulement si le sceau stocké correspond au dossier actuel.
export function verifySeal(sig) {
  const stored = String(sig?.seal_hash || "");
  const legacy = Boolean(sig?.seal_legacy);
  if (!/^[0-9a-f]{64}$/.test(stored)) return { ok: false, legacy };
  const a = Buffer.from(stored, "hex");
  const b = Buffer.from(computeSeal(sig), "hex");
  return { ok: a.length === b.length && crypto.timingSafeEqual(a, b), legacy };
}
