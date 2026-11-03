import { NextResponse } from "next/server";
import { query, tx } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sendActivationEmail } from "@/lib/email";
import { isUuid, readJson } from "@/lib/api";
import { activationLink } from "@/lib/activation";
import { issueClientAccess } from "@/lib/activationStore";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Crée l'accès d'un client, le réinitialise ou renvoie le lien d'activation.
// Aucun mot de passe n'est choisi ni transmis par l'admin : le client reçoit un
// lien à usage unique (72 h) pour choisir le sien. Si l'e-mail ne part pas (ou
// si sendEmail est faux), le lien est renvoyé à l'admin pour qu'elle le
// transmette elle-même.
export async function POST(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  const { email, sendEmail = true } = (await readJson(req)) || {};
  const login = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!login || login.length > 200 || !EMAIL_RE.test(login)) {
    return NextResponse.json({ error: "Adresse email de connexion invalide." }, { status: 400 });
  }
  try {
    const clientRes = await query("SELECT first_name, last_name FROM clients WHERE id = $1", [id]);
    const c = clientRes.rows[0];
    if (!c) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });

    const { token, expiresAt } = await tx((db) => issueClientAccess(db, { clientId: id, email: login }));
    const link = activationLink(token);

    let emailWarning = null;
    if (sendEmail) {
      try {
        await sendActivationEmail({ to: login, clientName: `${c.first_name} ${c.last_name}`, link, expiresAt });
      } catch (emailErr) {
        console.error("/api/clients/[id]/login :", emailErr?.message);
        emailWarning = "l'email n'a pas pu être envoyé";
      }
    }
    const emailed = Boolean(sendEmail) && !emailWarning;
    // Le lien n'est montré à l'admin que s'il n'est pas parti par e-mail.
    return NextResponse.json({ ok: true, emailed, emailWarning, link: emailed ? null : link, expiresAt });
  } catch (e) {
    console.error("/api/clients/[id]/login :", e?.message);
    if (String(e.message).includes("duplicate key")) {
      return NextResponse.json({ error: "Cet email est déjà utilisé par un autre compte." }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur, réessaie plus tard." }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  await query("DELETE FROM users WHERE client_id = $1", [id]);
  return NextResponse.json({ ok: true });
}
