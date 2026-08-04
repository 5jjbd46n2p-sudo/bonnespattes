import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  let client = null;
  if (user.client_id) {
    const { rows } = await query("SELECT * FROM clients WHERE id = $1", [user.client_id]);
    client = rows[0] || null;
  }
  return NextResponse.json({ user: { id: user.id, email: user.email, role: user.role }, client });
}
