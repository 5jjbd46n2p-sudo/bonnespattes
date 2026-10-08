import { adminPageGuard } from "@/lib/auth";
import Link from "next/link";
import { query } from "@/lib/db";
import { ArrowLeft } from "@phosphor-icons/react/ssr";
import TestimonialsManager from "./TestimonialsManager";

export const dynamic = "force-dynamic";

export default async function AvisPage() {
  await adminPageGuard();
  const { rows } = await query("SELECT id, author, detail, body, published FROM testimonials ORDER BY created_at DESC");
  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/admin/settings" className="text-sm text-pierre hover:underline inline-flex items-center gap-1">
        <ArrowLeft size={16} aria-hidden="true" />
        Réglages
      </Link>
      <div>
        <h1 className="font-display text-3xl font-semibold text-encre">Avis clients</h1>
        <p className="text-pierre mt-1">
          Les avis publiés apparaissent sur la page d'accueil (les 6 plus récents). La section est cachée tant qu'il n'y en
          a aucun. Ne publie un avis qu'avec l'accord de la personne, et utilise seulement son prénom.
        </p>
      </div>
      <TestimonialsManager initial={rows} />
    </div>
  );
}
