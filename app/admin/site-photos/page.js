import { adminPageGuard } from "@/lib/auth";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/ssr";
import { loadSitePhotos, SITE_PHOTO_SLOTS } from "@/lib/sitePhotos";
import SitePhotosManager from "./SitePhotosManager";

export const dynamic = "force-dynamic";

export default async function SitePhotosPage() {
  await adminPageGuard();
  const versions = await loadSitePhotos();
  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/admin/settings" className="text-sm text-pierre hover:underline inline-flex items-center gap-1">
        <ArrowLeft size={16} aria-hidden="true" />
        Réglages
      </Link>
      <div>
        <h1 className="font-display text-3xl font-semibold text-encre">Photos de la page d'accueil</h1>
        <p className="text-pierre mt-1">
          Choisis une photo dans ta galerie : elle apparaît tout de suite sur la page d'accueil. La photo principale
          est en haut ; la galerie apparaît dès qu'il y a au moins une photo.
        </p>
      </div>
      <SitePhotosManager slots={SITE_PHOTO_SLOTS} initial={versions} />
    </div>
  );
}
