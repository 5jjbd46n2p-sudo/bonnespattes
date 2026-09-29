import crypto from "crypto";
import { NextResponse } from "next/server";
import { applyRetention } from "@/lib/privacy";

// Tâche quotidienne (Vercel Cron, voir vercel.json) : applique les durées de
// conservation RGPD annoncées dans la politique de confidentialité.
// Vercel envoie « Authorization: Bearer <CRON_SECRET> » ; sans ce secret
// configuré, la route refuse de s'exécuter.
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  const ok =
    secret &&
    secret.length >= 16 &&
    given.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  try {
    const report = await applyRetention();
    console.log("Conservation RGPD appliquée :", JSON.stringify(report));
    return NextResponse.json({ ok: true, report });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Échec de la purge." }, { status: 500 });
  }
}
