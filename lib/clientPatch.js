// Validation des champs modifiables d'une fiche client (PATCH /api/clients/[id]).
// Renvoie { error } ou { body } (copie normalisée). `current` = fiche en base :
// le format de l'email n'est vérifié que s'il change, pour qu'une fiche
// ancienne mal saisie ne bloque pas la modification des autres champs.
const TEXT_MAX = { firstName: 100, lastName: 100, phone: 100, email: 200, address: 300, notes: 5000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateClientPatch(input, current = {}) {
  const body = { ...input };
  for (const [key, max] of Object.entries(TEXT_MAX)) {
    if (body[key] === undefined) continue;
    if (body[key] === null) body[key] = "";
    if (typeof body[key] !== "string") return { error: "Champ invalide." };
    body[key] = body[key].trim();
    if (body[key].length > max) return { error: `Texte trop long (${max} caractères maximum).` };
  }
  if (body.email && body.email !== String(current.email || "").trim() && !EMAIL_RE.test(body.email)) {
    return { error: "Adresse email invalide." };
  }
  if (body.hourlyRate !== undefined) {
    const n = body.hourlyRate === null || body.hourlyRate === "" ? 0 : Number(body.hourlyRate);
    if (!Number.isFinite(n) || n < 0 || n > 1000) return { error: "Tarif horaire invalide." };
    body.hourlyRate = Math.round(n * 100) / 100;
  }
  return { body };
}
