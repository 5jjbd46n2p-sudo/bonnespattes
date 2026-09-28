import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { sendClientCredentialsEmail } from "@/lib/email";

// Crée ou remplace l'identifiant/mot de passe d'un client
export async function POST(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  const { email, password, sendEmail } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
  }
  try {
    const hash = await hashPassword(password);
    const existing = await query("SELECT id FROM users WHERE client_id = $1", [id]);
    if (existing.rows[0]) {
      await query("UPDATE users SET email = $1, password_hash = $2 WHERE client_id = $3", [
        email.trim().toLowerCase(),
        hash,
        id,
      ]);
    } else {
      await query(
        "INSERT INTO users (email, password_hash, role, client_id) VALUES ($1,$2,'CLIENT',$3)",
        [email.trim().toLowerCase(), hash, id]
      );
    }

    let emailWarning = null;
    if (sendEmail) {
      try {
        const clientRes = await query("SELECT first_name, last_name FROM clients WHERE id = $1", [id]);
        const c = clientRes.rows[0];
        await sendClientCredentialsEmail({
          to: email.trim().toLowerCase(),
          clientName: c ? `${c.first_name} ${c.last_name}` : "",
          loginEmail: email.trim().toLowerCase(),
          loginPassword: password,
        });
      } catch (emailErr) {
        console.error(emailErr);
        emailWarning = emailErr.message;
      }
    }

    return NextResponse.json({ ok: true, emailWarning });
  } catch (e) {
    console.error(e);
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
  await query("DELETE FROM users WHERE client_id = $1", [id]);
  return NextResponse.json({ ok: true });
}
