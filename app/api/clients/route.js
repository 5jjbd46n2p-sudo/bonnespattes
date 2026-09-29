import { NextResponse } from "next/server";
import { query, tx } from "@/lib/db";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { passwordProblem } from "@/lib/security";
import { sendClientCredentialsEmail } from "@/lib/email";
import { ensureReferralCode } from "@/lib/referral";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { rows } = await query(`
    SELECT c.*,
      (SELECT COUNT(*) FROM pets p WHERE p.client_id = c.id) AS pet_count,
      (SELECT u.email FROM users u WHERE u.client_id = c.id LIMIT 1) AS login_email
    FROM clients c
    WHERE c.anonymized_at IS NULL
    ORDER BY c.last_name, c.first_name
  `);
  return NextResponse.json({ clients: rows });
}

export async function POST(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const body = await req.json();
  const {
    firstName,
    lastName,
    phone,
    email,
    address,
    notes,
    hourlyRate,
    pets = [],
    createLogin,
    loginEmail,
    loginPassword,
    sendEmail,
  } = body;

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "Prénom et nom requis." }, { status: 400 });
  }
  if (createLogin && (!loginEmail || !loginPassword)) {
    return NextResponse.json(
      { error: "Email et mot de passe requis pour créer l'accès client." },
      { status: 400 }
    );
  }
  if (createLogin) {
    const problem = passwordProblem(loginPassword, { email: loginEmail });
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  }

  try {
    const result = await tx(async (client) => {
      const clientRes = await client.query(
        `INSERT INTO clients (first_name, last_name, phone, email, address, notes, hourly_rate)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [firstName, lastName, phone || "", email || "", address || "", notes || "", hourlyRate || 0]
      );
      const newClient = clientRes.rows[0];
      newClient.referral_code = await ensureReferralCode(client, newClient.id);

      for (const pet of pets) {
        if (!pet.name) continue;
        await client.query(
          `INSERT INTO pets (client_id, name, species, breed, notes) VALUES ($1,$2,$3,$4,$5)`,
          [newClient.id, pet.name, pet.species || "", pet.breed || "", pet.notes || ""]
        );
      }

      if (createLogin) {
        const hash = await hashPassword(loginPassword);
        await client.query(
          // Mot de passe provisoire : le client devra le remplacer à sa première connexion.
          `INSERT INTO users (email, password_hash, role, client_id, must_change_password) VALUES ($1,$2,'CLIENT',$3,true)`,
          [loginEmail.trim().toLowerCase(), hash, newClient.id]
        );
      }

      return newClient;
    });

    // L'envoi de l'email se fait après la transaction : un échec d'envoi ne
    // doit pas empêcher la création du client, on renvoie juste un avertissement.
    let emailWarning = null;
    if (createLogin && sendEmail) {
      try {
        await sendClientCredentialsEmail({
          to: loginEmail.trim().toLowerCase(),
          clientName: `${firstName} ${lastName}`,
          loginEmail: loginEmail.trim().toLowerCase(),
          loginPassword,
        });
      } catch (emailErr) {
        console.error(emailErr);
        emailWarning = "l'email n'a pas pu être envoyé";
      }
    }

    return NextResponse.json({ client: result, emailWarning });
  } catch (e) {
    console.error(e);
    if (String(e.message).includes("duplicate key")) {
      return NextResponse.json(
        { error: "Cet email de connexion est déjà utilisé." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Erreur serveur, réessaie plus tard." }, { status: 500 });
  }
}
