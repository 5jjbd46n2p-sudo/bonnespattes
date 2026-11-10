import { notFound } from "next/navigation";
import { adminPageGuard } from "@/lib/auth";
import { isUuid } from "@/lib/api";
import { loadDesign, loadDesignSettings } from "@/lib/designData";
import { designInfo } from "@/lib/designTemplates";
import EditorLoader from "@/components/design/EditorLoader";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Conception — Aux Bonnes Pattes",
};

export default async function ConceptionEditorPage({ params }) {
  await adminPageGuard();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const design = await loadDesign(id);
  if (!design) notFound();

  const settings = await loadDesignSettings();
  const info = designInfo(settings || {}, process.env.NEXT_PUBLIC_APP_URL || "");

  // Objet simple (sérialisable) pour le composant client.
  const props = {
    id: design.id,
    name: design.name,
    format: design.format,
    orientation: design.orientation,
    pages: Array.isArray(design.pages) ? design.pages : [],
  };

  return <EditorLoader design={props} info={info} />;
}
