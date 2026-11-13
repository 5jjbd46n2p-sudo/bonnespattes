import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readJson } from "@/lib/api";
import { parseDesignCreate } from "@/lib/designFields";
import { TEMPLATES, blankPages, designInfo } from "@/lib/designTemplates";
import { listDesigns, insertDesign, loadDesignSettings } from "@/lib/designData";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  try {
    const designs = await listDesigns();
    return NextResponse.json({ designs });
  } catch (e) {
    console.error("GET /api/designs :", e?.message);
    return NextResponse.json({ error: "Impossible de charger tes conceptions." }, { status: 500 });
  }
}

export async function POST(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const parsed = parseDesignCreate(await readJson(req));
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { name, format, templateId } = parsed.value;
  let { orientation } = parsed.value;

  try {
    let pages;
    if (templateId) {
      const template = TEMPLATES.find((t) => t.id === templateId && t.format === format);
      if (!template) return NextResponse.json({ error: "Modèle inconnu." }, { status: 400 });
      const settings = await loadDesignSettings();
      pages = template.build(designInfo(settings, process.env.NEXT_PUBLIC_APP_URL));
      // Le modèle est dessiné pour son orientation : on la garde pour que la toile corresponde.
      if (template.orientation) orientation = template.orientation;
    } else {
      pages = blankPages(format);
    }
    const design = await insertDesign({ name, format, orientation, pages });
    return NextResponse.json({ design }, { status: 201 });
  } catch (e) {
    console.error("POST /api/designs :", e?.message);
    return NextResponse.json({ error: "Impossible de créer la conception." }, { status: 500 });
  }
}
