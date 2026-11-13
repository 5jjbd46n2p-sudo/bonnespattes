import { adminPageGuard } from "@/lib/auth";
import { listDesigns } from "@/lib/designData";
import DesignsList from "./DesignsList";

export const dynamic = "force-dynamic";

export default async function ConceptionPage() {
  await adminPageGuard();

  // Même liste que GET /api/designs (sans les faces, dates en ISO).
  let designs = [];
  let unavailable = false;
  try {
    designs = await listDesigns();
  } catch (e) {
    console.error("Liste des conceptions :", e);
    unavailable = true;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold text-encre">Conception</h1>
        <p className="text-pierre mt-1">Tes cartes de visite et flyers, prêts pour Vistaprint.</p>
      </div>
      {unavailable ? (
        <p className="text-pierre">Les conceptions ne sont pas encore disponibles (base à mettre à jour).</p>
      ) : (
        <DesignsList designs={designs} />
      )}
    </div>
  );
}
