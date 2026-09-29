import { quoteLines, estimateText } from "@/lib/quote";

// Envoi de l'email contenant les identifiants (email + mot de passe) du portail
// client, via l'API REST de Resend (https://resend.com — pas de SDK nécessaire).
//
// Variables d'environnement à configurer (voir .env.example) :
// - RESEND_API_KEY        : clé API Resend (obligatoire pour que l'envoi fonctionne)
// - EMAIL_FROM             : adresse d'expédition, ex. "Aux Bonnes Pattes <contact@tondomaine.fr>"
// - EMAIL_REPLY_TO         : (optionnel) adresse qui reçoit les réponses des clients
// - NEXT_PUBLIC_APP_URL    : URL publique de l'application, pour inclure un lien de connexion

export async function sendClientCredentialsEmail({ to, clientName, loginEmail, loginPassword }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Envoi d'email non configuré : ajoute la variable RESEND_API_KEY (et EMAIL_FROM) dans tes variables d'environnement."
    );
  }
  if (!to) {
    throw new Error("Adresse email du client manquante.");
  }

  const from = process.env.EMAIL_FROM || "Aux Bonnes Pattes <onboarding@resend.dev>";
  const replyTo = process.env.EMAIL_REPLY_TO || undefined;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const loginUrl = appUrl ? `${appUrl.replace(/\/$/, "")}/login` : null;

  // Couleurs de docs/IDENTITE_VISUELLE.md (papier, lin, encre, pierre, trait, rouille).
  // Styles en ligne : les clients mail ignorent les feuilles de style.
  const firstName = clientName ? escapeHtml(String(clientName).trim().split(/\s+/)[0]) : "";
  const html = `
    <div style="background:#F7F2EA; padding:24px 12px;">
      <div style="font-family: 'Atkinson Hyperlegible', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:16px; line-height:1.6; max-width:520px; margin:0 auto; color:#1F1A15; background:#FFFCF7; border:1px solid #E3D9C9; border-radius:8px; padding:24px;">
        <p style="font-family: Georgia, 'Times New Roman', serif; font-size:20px; font-weight:600; margin:0 0 16px;">Aux Bonnes Pattes</p>
        <p style="margin:0 0 12px;">Bonjour${firstName ? ` ${firstName}` : ""},</p>
        <p style="margin:0 0 12px;">Voici vos accès à l'espace Aux Bonnes Pattes. Après chaque visite, vous y retrouverez le compte rendu, les photos de votre compagnon et vos factures.</p>
        <p style="background:#EFE7DA; padding:12px 16px; border-radius:8px; margin:0 0 16px;">
          <strong>Identifiant :</strong> ${escapeHtml(loginEmail)}<br/>
          <strong>Mot de passe :</strong> ${escapeHtml(loginPassword)}
        </p>
        ${loginUrl ? `<p style="margin:0 0 16px;"><a href="${loginUrl}" style="display:inline-block; background:#A8481F; color:#FFFFFF; text-decoration:none; font-weight:700; padding:10px 18px; border-radius:8px;">Se connecter</a></p>` : ""}
        <p style="margin:0 0 12px;">Gardez ce message en lieu sûr. Si vous souhaitez changer de mot de passe, répondez simplement à cet email.</p>
        <p style="margin:0;">À très bientôt,<br/>Aurore</p>
      </div>
    </div>
  `.trim();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject: "Vos accès à l'espace Aux Bonnes Pattes",
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Échec de l'envoi de l'email (${res.status}) : ${text || "erreur inconnue"}`);
  }

  return true;
}

// Emails d'une demande reçue via la page publique : notification à Aurore
// (settings.contact_email) + accusé de réception au demandeur. Ne lève jamais.
export async function sendLeadEmails({ lead, contactEmail, referrerName, settings = {} }) {
  const isQuote = lead.kind === "DEVIS" && lead.quote;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY manquant" };
  const from = process.env.EMAIL_FROM || "Aux Bonnes Pattes <onboarding@resend.dev>";
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const wrap = (inner) => `
    <div style="background:#F7F2EA; padding:24px 12px;">
      <div style="font-family: 'Atkinson Hyperlegible', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:16px; line-height:1.6; max-width:520px; margin:0 auto; color:#1F1A15; background:#FFFCF7; border:1px solid #E3D9C9; border-radius:8px; padding:24px;">
        <p style="font-family: Georgia, 'Times New Roman', serif; font-size:20px; font-weight:600; margin:0 0 16px;">Aux Bonnes Pattes</p>
        ${inner}
      </div>
    </div>`.trim();
  const e = (v) => escapeHtml(v || "—");
  const serviceLabel = { VISITE: "Visite à domicile", PROMENADE: "Promenade", LES_DEUX: "Visite et promenade" }[lead.service] || "—";
  const send = async (payload) => {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, ...payload }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}`);
  };
  const firstName = escapeHtml(String(lead.name || "").trim().split(/\s+/)[0]);
  const tasks = [];
  if (contactEmail) {
    const notif = wrap(`
        <p style="margin:0 0 12px;"><strong>${isQuote ? "Nouvelle demande de devis" : "Nouvelle demande de rendez-vous"}</strong></p>
        <p style="background:#EFE7DA; padding:12px 16px; border-radius:8px; margin:0 0 16px;">
          <strong>Nom :</strong> ${e(lead.name)}<br/>
          <strong>Email :</strong> ${e(lead.email)}<br/>
          <strong>Téléphone :</strong> ${e(lead.phone)}<br/>
          <strong>Commune :</strong> ${e(lead.commune)}<br/>
          <strong>Animaux :</strong> ${e(lead.animals)}<br/>
          ${isQuote ? "" : `<strong>Service :</strong> ${escapeHtml(serviceLabel)}<br/>`}
          <strong>Recommandé par :</strong> ${referrerName ? escapeHtml(referrerName) : "—"}
        </p>
        ${isQuote ? `<p style="background:#EFE7DA; padding:12px 16px; border-radius:8px; margin:0 0 16px; white-space:pre-wrap;">${quoteLines(lead.quote).map(([k, v]) => `<strong>${escapeHtml(k)} :</strong> ${escapeHtml(v)}`).join("<br/>")}</p>
        <p style="margin:0 0 16px;"><strong>${escapeHtml(estimateText(lead.quote, settings))}</strong><br/><em>Indicatif seulement : à vous de confirmer le devis et le déplacement.</em></p>` : ""}
        ${lead.message ? `<p style="margin:0 0 16px; white-space:pre-wrap;">${e(lead.message)}</p>` : ""}
        ${appUrl ? `<p style="margin:0;"><a href="${appUrl}/admin/leads" style="display:inline-block; background:#A8481F; color:#FFFFFF; text-decoration:none; font-weight:700; padding:10px 18px; border-radius:8px;">Voir les demandes</a></p>` : ""}`);
    tasks.push(send({ to: contactEmail, reply_to: lead.email, subject: `${isQuote ? "Demande de devis" : "Nouvelle demande"} : ${String(lead.name).replace(/[\r\n]+/g, " ").slice(0, 80)}`, html: notif }));
  }
  const ack = wrap(`
        <p style="margin:0 0 12px;">Bonjour${firstName ? ` ${firstName}` : ""},</p>
        <p style="margin:0 0 12px;">${isQuote ? "Merci pour votre demande de devis, elle est bien arrivée. Aurore vous envoie un devis sous 48 h." : "Merci pour votre demande, elle est bien arrivée. Aurore vous répond sous 24 h pour convenir d'une première rencontre, gratuite et sans engagement."}</p>
        <p style="margin:0;">À très bientôt,<br/>Aurore</p>`);
  const ackPayload = { to: lead.email, subject: isQuote ? "Votre demande de devis a bien été reçue" : "Votre demande a bien été reçue", html: ack };
  if (contactEmail) ackPayload.reply_to = contactEmail;
  tasks.push(send(ackPayload));
  const results = await Promise.allSettled(tasks);
  const failed = results.filter((r) => r.status === "rejected");
  failed.forEach((r) => console.error("sendLeadEmails:", r.reason?.message));
  return { ok: failed.length === 0 };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
