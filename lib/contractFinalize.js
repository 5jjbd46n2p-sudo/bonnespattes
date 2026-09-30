import { query } from "@/lib/db";
import { buildContractPdf } from "@/lib/contract";
import { sendSignedContractEmail } from "@/lib/email";

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
        await sendSignedContractEmail({ ...t, clientName, pdfBase64, filename });
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
