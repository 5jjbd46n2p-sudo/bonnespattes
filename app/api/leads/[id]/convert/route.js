import { NextResponse } from "next/server";
import { tx } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ensureReferralCode } from "@/lib/referral";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });

  try {
    const clientId = await tx(async (db) => {
      const lr = await db.query("SELECT * FROM leads WHERE id = $1 FOR UPDATE", [id]);
      const lead = lr.rows[0];
      if (!lead) throw Object.assign(new Error("Demande introuvable."), { status: 404 });
      if (lead.client_id || lead.status === "CLIENT") {
        throw Object.assign(new Error("Cette demande est déjà convertie en client."), { status: 409 });
      }

      const parts = String(lead.name).trim().split(/\s+/);
      const firstName = parts.shift() || lead.name;
      const lastName = parts.join(" ");
      const cr = await db.query(
        `INSERT INTO clients (first_name, last_name, phone, email, address, notes, hourly_rate)
         VALUES ($1,$2,$3,$4,'','',0) RETURNING id`,
        [firstName, lastName, lead.phone || "", lead.email]
      );
      const newId = cr.rows[0].id;
      await ensureReferralCode(db, newId);
      await db.query("UPDATE leads SET client_id = $1, status = 'CLIENT' WHERE id = $2", [newId, id]);

      if (lead.referrer_client_id) {
        const amount = Number((await db.query("SELECT referral_credit FROM settings LIMIT 1")).rows[0]?.referral_credit);
        if (Number.isFinite(amount) && amount > 0) {
          const reason = `Parrainage — ${lead.name}`;
          for (const cid of [lead.referrer_client_id, newId]) {
            await db.query(
              `INSERT INTO client_credits (client_id, amount, reason, lead_id) VALUES ($1,$2,$3,$4)
               ON CONFLICT (client_id, lead_id) DO NOTHING`,
              [cid, amount, reason, id]
            );
          }
        }
      }
      return newId;
    });
    return NextResponse.json({ clientId });
  } catch (e) {
    if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur, réessaie plus tard." }, { status: 500 });
  }
}
