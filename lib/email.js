// Envoi de l'email contenant les identifiants (email + mot de passe) du portail
// client, via l'API REST de Resend (https://resend.com — pas de SDK nécessaire).
//
// Variables d'environnement à configurer (voir .env.example) :
// - RESEND_API_KEY        : clé API Resend (obligatoire pour que l'envoi fonctionne)
// - EMAIL_FROM             : adresse d'expédition, ex. "Aux Bonnes Pattes <contact@tondomaine.fr>"
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const loginUrl = appUrl ? `${appUrl.replace(/\/$/, "")}/login` : null;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #16263a; line-height: 1.5;">
      <p style="font-size:18px; font-weight:700; color:#13304d; margin: 0 0 20px;">Aux Bonnes Pattes</p>
      <p>Bonjour ${clientName ? escapeHtml(clientName) : ""},</p>
      <p>Voici vos identifiants pour accéder à votre espace de suivi. Vous y retrouverez le compte rendu et les photos de chaque visite, ainsi que vos factures.</p>
      <p style="background:#f4f6f9; border:1px solid #dfe5ec; padding:12px 16px; border-radius:8px; line-height: 1.6;">
        <strong>Identifiant :</strong> ${escapeHtml(loginEmail)}<br/>
        <strong>Mot de passe :</strong> ${escapeHtml(loginPassword)}
      </p>
      ${loginUrl ? `<p><a href="${loginUrl}" style="display:inline-block; background:#1f4e79; color:#ffffff; font-weight:600; padding:10px 18px; border-radius:8px; text-decoration:none;">Accéder à mon espace</a></p>` : ""}
      <p style="font-size:12px; color:#888; margin-top: 24px;">
        Conservez ces informations en lieu sûr. Pour changer de mot de passe, il suffit de nous le demander.
      </p>
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
      subject: "Vos identifiants Aux Bonnes Pattes",
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Échec de l'envoi de l'email (${res.status}) : ${text || "erreur inconnue"}`);
  }

  return true;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
