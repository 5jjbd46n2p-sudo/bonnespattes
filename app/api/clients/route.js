import { NextResponse } from "next/server";
import { query, tx } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sendActivationEmail } from "@/lib/email";
import { activationLink } from "@/lib/activation";
import { issueClientAccess } from "@/lib/activationStore";
import { ensureReferralCode } from "@/lib/referral";
import { readJson } from "@/lib/api";

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

  const body = await readJson(req);
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
    sendEmail,
  } = body;

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "Prénom et nom requis." }, { status: 400 });
  }
  const login = typeof loginEmail === "string" ? loginEmail.trim().toLowerCase() : "";
  if (createLogin && (!login || login.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login))) {
    return NextResponse.json({ error: "Email de connexion requis pour créer l'accès client." }, { status: 400 });
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

      // Accès client : compte sans mot de passe utilisable + lien d'activation
      // (le client choisit son mot de passe ; aucun mot de passe par e-mail).
      const access = createLogin ? await issueClientAccess(client, { clientId: newClient.id, email: login }) : null;

      return { newClient, access };
    });

    // L'envoi de l'email se fait après la transaction : un échec d'envoi ne
    // doit pas empêcher la création du client, on renvoie juste un avertissement.
    let emailWarning = null;
    let link = null;
    if (result.access) {
      link = activationLink(result.access.token);
      if (sendEmail) {
        try {
          await sendActivationEmail({
            to: login,
            clientName: `${firstName} ${lastName}`,
            link,
            expiresAt: result.access.expiresAt,
          });
        } catch (emailErr) {
          console.error("/api/clients :", emailErr?.message);
          emailWarning = "l'email n'a pas pu être envoyé";
        }
      }
    }
    const emailed = Boolean(result.access && sendEmail && !emailWarning);
    // Le lien n'est montré à l'admin que s'il n'est pas parti par e-mail.
    return NextResponse.json({ client: result.newClient, emailWarning, activationLink: emailed ? null : link });
  } catch (e) {
    console.error("/api/clients :", e?.message);
    if (String(e.message).includes("duplicate key")) {
      return NextResponse.json(
        { error: "Cet email de connexion est déjà utilisé." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Erreur serveur, réessaie plus tard." }, { status: 500 });
  }
}
