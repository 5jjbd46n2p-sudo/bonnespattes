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
        <p style="margin:0 0 12px;">Ce mot de passe est provisoire : à votre première connexion, il vous sera demandé d'en choisir un nouveau, que vous seul connaîtrez. Supprimez ensuite ce message.</p>
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
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// --- Contrat à signature électronique ---

function emailShell(inner) {
  return `
    <div style="background:#F7F2EA; padding:24px 12px;">
      <div style="font-family: 'Atkinson Hyperlegible', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:16px; line-height:1.6; max-width:520px; margin:0 auto; color:#1F1A15; background:#FFFCF7; border:1px solid #E3D9C9; border-radius:8px; padding:24px;">
        <p style="font-family: Georgia, 'Times New Roman', serif; font-size:20px; font-weight:600; margin:0 0 16px;">Aux Bonnes Pattes</p>
        ${inner}
      </div>
    </div>
  `.trim();
}

// Envoi générique via Resend, avec pièces jointes optionnelles ({ filename, content } en base64).
async function sendResendEmail({ to, subject, html, attachments }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Envoi d'email non configuré : ajoute la variable RESEND_API_KEY (et EMAIL_FROM) dans tes variables d'environnement."
    );
  }
  if (!to) throw new Error("Adresse email du destinataire manquante.");
  const from = process.env.EMAIL_FROM || "Aux Bonnes Pattes <onboarding@resend.dev>";
  const replyTo = process.env.EMAIL_REPLY_TO || undefined;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject,
      html,
      ...(attachments?.length ? { attachments } : {}),
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Échec de l'envoi de l'email (${res.status}) : ${text || "erreur inconnue"}`);
  }
  return true;
}

function greeting(clientName) {
  const firstName = clientName ? escapeHtml(String(clientName).trim().split(/\s+/)[0]) : "";
  return `<p style="margin:0 0 12px;">Bonjour${firstName ? ` ${firstName}` : ""},</p>`;
}

// inAccount : le client a un espace client, il signe après connexion (pas de code par email).
export async function sendContractEmail({ to, clientName, link, expiresAt, inAccount = false }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const url = link || (appUrl ? appUrl : "");
  const until = expiresAt
    ? new Date(expiresAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" })
    : null;
  const html = emailShell(inAccount
    ? `
        ${greeting(clientName)}
        <p style="margin:0 0 12px;">Votre contrat de prestation de services de pet-sitting vous attend dans votre espace client. Connectez-vous, puis ouvrez « Contrat à signer » en haut de la page : vous pourrez le lire en entier et le signer directement, sans code à recopier.</p>
        <p style="margin:0 0 16px;"><a href="${escapeHtml(url)}" style="display:inline-block; background:#A8481F; color:#FFFFFF; text-decoration:none; font-weight:700; padding:10px 18px; border-radius:8px;">Me connecter et signer</a></p>
        ${until ? `<p style="margin:0 0 12px;">À signer avant le ${escapeHtml(until)}.</p>` : ""}
        <p style="margin:0 0 12px;">Un souci pour vous connecter ? Répondez à ce message. Un exemplaire PDF signé vous sera envoyé dès la signature.</p>
        <p style="margin:0;">À très bientôt,<br/>Aurore</p>`
    : `
        ${greeting(clientName)}
        <p style="margin:0 0 12px;">Voici votre contrat de prestation de services de pet-sitting. Vous pouvez le lire en entier, puis le signer en ligne : un code à usage unique vous sera envoyé par email pour confirmer votre signature.</p>
        <p style="margin:0 0 16px;"><a href="${escapeHtml(url)}" style="display:inline-block; background:#A8481F; color:#FFFFFF; text-decoration:none; font-weight:700; padding:10px 18px; border-radius:8px;">Lire et signer le contrat</a></p>
        ${until ? `<p style="margin:0 0 12px;">Ce lien est valable jusqu'au ${escapeHtml(until)}. Ne le partagez avec personne.</p>` : ""}
        <p style="margin:0 0 12px;">Un exemplaire PDF signé vous sera envoyé dès la signature.</p>
        <p style="margin:0;">À très bientôt,<br/>Aurore</p>`);
  return sendResendEmail({ to, subject: "Votre contrat Aux Bonnes Pattes à signer", html });
}

export async function sendContractOtpEmail({ to, clientName, code }) {
  const html = emailShell(`
        ${greeting(clientName)}
        <p style="margin:0 0 12px;">Voici votre code pour signer le contrat :</p>
        <p style="background:#EFE7DA; padding:12px 16px; border-radius:8px; margin:0 0 16px; font-size:24px; font-weight:700; letter-spacing:4px; text-align:center;">${escapeHtml(code)}</p>
        <p style="margin:0 0 12px;">Il est valable 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
        <p style="margin:0;">Aurore</p>`);
  return sendResendEmail({ to, subject: "Votre code de signature Aux Bonnes Pattes", html });
}

// pdfBase64 : contenu du PDF signé encodé en base64
export async function sendSignedContractEmail({ to, clientName, pdfBase64, filename, forBusiness }) {
  const html = emailShell(
    forBusiness
      ? `<p style="margin:0 0 12px;">Le contrat de ${escapeHtml(clientName || "votre client")} vient d'être signé. Vous trouverez l'exemplaire PDF signé en pièce jointe.</p>`
      : `${greeting(clientName)}
        <p style="margin:0 0 12px;">Merci, votre contrat est signé. Vous trouverez votre exemplaire PDF en pièce jointe : conservez-le précieusement.</p>
        <p style="margin:0;">À très bientôt,<br/>Aurore</p>`
  );
  return sendResendEmail({
    to,
    subject: forBusiness ? `Contrat signé : ${clientName || "client"}` : "Votre contrat signé Aux Bonnes Pattes",
    html,
    attachments: [{ filename, content: pdfBase64 }],
  });
}

// Devis : PDF en pièce jointe (pdfBase64 = contenu encodé en base64).
export async function sendQuoteEmail({ to, clientName, number, validUntil, message, pdfBase64 }) {
  const until = validUntil
    ? new Date(validUntil).toLocaleDateString("fr-FR", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" })
    : null;
  const html = emailShell(`
        ${greeting(clientName)}
        <p style="margin:0 0 12px;">Suite à votre demande, voici mon devis pour les visites prévues. Vous le trouverez en pièce jointe (PDF).</p>
        ${message ? `<p style="margin:0 0 12px; white-space:pre-line;">${escapeHtml(message)}</p>` : ""}
        <p style="margin:0 0 12px;">Pour l'accepter, répondez simplement à ce message par « Bon pour accord »${until ? ` avant le ${until}` : ""}.</p>
        <p style="margin:0;">À très bientôt,<br/>Aurore</p>`);
  return sendResendEmail({
    to,
    subject: `Votre devis ${number} - Aux Bonnes Pattes`,
    html,
    attachments: [{ filename: `${String(number).replace(/[^A-Za-z0-9_-]/g, "")}.pdf`, content: pdfBase64 }],
  });
}

// Transmission des données personnelles au client (RGPD, droit d'accès / portabilité).
export async function sendClientDataEmail({ to, clientName, jsonBase64 }) {
  const html = emailShell(`
        ${greeting(clientName)}
        <p style="margin:0 0 12px;">Comme vous l'avez demandé, voici l'ensemble des données personnelles vous concernant que je conserve (profil, animaux, visites, factures, contrat), dans un fichier structuré en pièce jointe (format JSON, lisible par un ordinateur et ouvrable avec un simple éditeur de texte).</p>
        <p style="margin:0 0 12px;">Vous pouvez aussi me demander de corriger une information, ou de supprimer vos données (sous réserve des documents comptables que la loi m'oblige à conserver). Répondez simplement à ce message.</p>
        <p style="margin:0;">Aurore</p>`);
  return sendResendEmail({
    to,
    subject: "Vos données personnelles - Aux Bonnes Pattes",
    html,
    attachments: [{ filename: "mes-donnees.json", content: jsonBase64 }],
  });
}

// --- Alertes de sécurité (modification sensible sur le compte administrateur) ---
export async function sendSecurityAlertEmail({ to, subject, lines }) {
  const recipients = [...new Set((Array.isArray(to) ? to : [to]).map((x) => String(x || "").trim()).filter(Boolean))];
  if (!recipients.length) return false;
  const when = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
  const html = emailShell(`
    <p style="margin:0 0 12px;"><strong>${escapeHtml(subject)}</strong></p>
    ${lines.map((l) => `<p style="margin:0 0 12px;">${escapeHtml(l)}</p>`).join("")}
    <p style="margin:0 0 12px;">Date : ${escapeHtml(when)} (heure de Paris).</p>
    <p style="margin:0; color:#6B5E50;">Si ce n'est pas toi : change immédiatement ton mot de passe, active la double authentification et vérifie l'IBAN dans Réglages.</p>
  `);
  await sendResendEmail({ to: recipients, subject: `Alerte sécurité : ${subject}`, html });
  return true;
}
