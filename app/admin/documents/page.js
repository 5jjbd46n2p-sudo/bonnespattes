import Link from "next/link";
import { adminPageGuard } from "@/lib/auth";
import { DOCUMENTS, progressOf } from "@/lib/documents";
import { loadDone } from "@/lib/docChecklist";
import { formatDateFR } from "@/lib/utils";
import { CaretRight } from "@phosphor-icons/react/ssr";

export const dynamic = "force-dynamic";

export const metadata = { title: "Documents - Aux Bonnes Pattes" };

export default async function DocumentsPage() {
  await adminPageGuard();
  const docs = await Promise.all(
    DOCUMENTS.map(async (d) => ({ doc: d, progress: progressOf(d, await loadDone(d.slug)) }))
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-encre">Documents</h1>
        <p className="text-pierre mt-1">Tes plans de route, avec une checklist pour suivre où tu en es.</p>
      </div>
      <ul className="list-group">
        {docs.map(({ doc, progress }) => (
          <li key={doc.slug}>
            <Link href={`/admin/documents/${doc.slug}`} className="flex items-center gap-4 p-4 hover:bg-sable">
              <div className="flex-1 min-w-0">
                <p className="font-display text-xl font-semibold text-encre">{doc.title}</p>
                <p className="text-sm text-pierre mt-1">{doc.summary}</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-sable overflow-hidden" aria-hidden="true">
                    <div className="h-full bg-mousse" style={{ width: `${progress.percent}%` }} />
                  </div>
                  <p className="text-sm text-pierre tabular-nums whitespace-nowrap">
                    {progress.done} sur {progress.total} étapes
                  </p>
                </div>
                <p className="text-xs text-pierre mt-2">Mis à jour le {formatDateFR(doc.updated)}</p>
              </div>
              <CaretRight size={20} className="text-pierre shrink-0" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
