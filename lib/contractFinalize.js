import { query } from "@/lib/db";
import { buildContractPdf } from "@/lib/contract";
import { sendSignedContractEmail } from "@/lib/email";
import { computeSeal, verifySeal } from "@/lib/contractSeal";
import { alertAdmin } from "@/lib/security";
import { audit } from "@/lib/audit";

// Dans la transaction de signature : pose le sceau d'intégrité du dossier signé
// (spec sécurité lot 0, §1) et trace la signature dans le journal d'audit.
// `signed` doit contenir signed_at_utc (voir SIGNED_AT_UTC_SQL).
export async function sealSignedContract(db, signed, actorId = null) {
  const sealHash = computeSeal(signed);
  const { rows } = await db.query(
    "UPDATE contract_signatures SET seal_hash = $2, sealed_at = signed_at WHERE id = $1 AND status = 'SIGNE' AND seal_hash IS NULL RETURNING seal_hash, sealed_at",
    [signed.id, sealHash]
  );
  if (!rows[0]) throw new Error("Scellement du contrat impossible.");
  await audit(db, { actorId, action: "contract.sign", entity: "contract", entityId: signed.id });
  return { ...signed, seal_hash: rows[0].seal_hash, sealed_at: rows[0].sealed_at, seal_legacy: false };
}

// Après une signature : envoie l'exemplaire PDF signé au client et à Aurore.
// La signature reste valable même si l'email échoue (retourne alors false).
export async function sendSignedCopies(signed) {
  let emailed = true;
  try {
    const [clientRes, settingsRes] = await Promise.all([
      query("SELECT * FROM clients WHERE id = $1", [signed.client_id]),
      query("SELECT contact_email FROM settings LIMIT 1"),
    ]);
    const client = clientRes.rows[0];
    const clientName = client ? `${client.first_name} ${client.last_name}` : signed.signer_name;
    const bytes = await buildContractPdf(signed, client);
    const pdfBase64 = Buffer.from(bytes).toString("base64");
    const filename = `contrat-signe-v${signed.version}.pdf`;
    const targets = [{ to: signed.sent_to, forBusiness: false }];
    const biz = String(settingsRes.rows[0]?.contact_email || "").trim();
    if (biz) targets.push({ to: biz, forBusiness: true });
    for (const t of targets) {
      try {
        await sendSignedContractEmail({ ...t, clientName, pdfBase64, filename, sealHash: signed.seal_hash });
      } catch (e) {
        emailed = false;
        console.error("Envoi du contrat signé échoué :", e.message);
      }
    }
  } catch (e) {
    emailed = false;
    console.error("Génération/envoi du contrat signé échoué :", e.message);
  }
  return emailed;
}

// Avant de rendre le PDF d'un contrat signé : le dossier doit correspondre à son
// sceau. En cas d'écart (ligne modifiée en base), le PDF est refusé, l'admin
// est prévenue par e-mail et l'incident est tracé. Renvoie { ok, legacy }.
export async function checkContractIntegrity(sig, actorId = null) {
  if (sig.status !== "SIGNE") return { ok: true, legacy: false };
  const result = verifySeal(sig);
  if (result.ok) return result;
  await audit(null, { actorId, action: "contract.integrity_failure", entity: "contract", entityId: sig.id });
  try {
    const admins = await query("SELECT email FROM users WHERE role = 'ADMIN' ORDER BY created_at LIMIT 1");
    await alertAdmin(admins.rows[0]?.email, "un contrat signé ne correspond plus à son sceau d'intégrité", [
      `Contrat ${sig.id} (version ${sig.version}).`,
      "Le PDF a été refusé. Vérifie le journal d'audit et restaure la base si besoin.",
    ]);
  } catch (e) {
    console.error("Alerte d'intégrité non envoyée :", e?.message);
  }
  return result;
}
