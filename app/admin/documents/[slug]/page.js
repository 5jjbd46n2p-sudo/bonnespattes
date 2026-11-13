import Link from "next/link";
import { notFound } from "next/navigation";
import { adminPageGuard } from "@/lib/auth";
import { getDocument } from "@/lib/documents";
import { loadDone } from "@/lib/docChecklist";
import { formatDateFR } from "@/lib/utils";
import DocChecklist from "@/components/DocChecklist";
import AddPlanToPlanning from "@/components/AddPlanToPlanning";
import { planTasks } from "@/lib/planTasks";
import { ArrowLeft } from "@phosphor-icons/react/ssr";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const doc = getDocument(slug);
  return { title: `${doc ? doc.title : "Document"} - Aux Bonnes Pattes` };
}

function Block({ block }) {
  if (block.p) return <p className="leading-relaxed">{block.p}</p>;
  if (block.h3) return <h3 className="font-bold text-encre pt-2">{block.h3}</h3>;
  if (block.note) return <p className="bg-sable rounded-lg px-4 py-3 leading-relaxed">{block.note}</p>;
  if (block.ul || block.ol) {
    const Tag = block.ol ? "ol" : "ul";
    return (
      <Tag className={`${block.ol ? "list-decimal" : "list-disc"} pl-5 space-y-1.5 leading-relaxed marker:text-rouille`}>
        {(block.ol || block.ul).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </Tag>
    );
  }
  if (block.table) {
    return (
      <div className="overflow-x-auto border border-trait rounded-lg bg-lin">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr>
              {block.table.head.map((h, i) => (
                <th key={i} scope="col" className="text-left font-bold text-pierre px-3 py-2 border-b border-trait">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.table.rows.map((row, r) => (
              <tr key={r} className="border-b border-trait last:border-b-0">
                {row.map((cell, c) => (
                  <td key={c} className={`px-3 py-2 align-top ${c === 0 ? "font-bold text-encre" : ""}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return null;
}

export default async function DocumentPage({ params }) {
  await adminPageGuard();
  const { slug } = await params;
  const doc = getDocument(slug);
  if (!doc) notFound();
  const done = await loadDone(doc.slug);
  const tasks = planTasks(doc.slug);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href="/admin/documents" className="text-sm text-pierre hover:underline inline-flex items-center gap-1">
          <ArrowLeft size={16} aria-hidden="true" />
          Documents
        </Link>
        <h1 className="font-display text-3xl font-semibold text-encre mt-2">{doc.title}</h1>
        <p className="text-pierre mt-1">
          {doc.summary} Mis à jour le {formatDateFR(doc.updated)}.
        </p>
      </div>

      <section aria-labelledby="checklist-titre" className="card p-5">
        <h2 id="checklist-titre" className="font-display text-xl font-semibold text-encre mb-3">
          Checklist
        </h2>
        <DocChecklist slug={doc.slug} groups={doc.checklist} initialDone={done} />
      </section>

      {tasks.length > 0 && (
        <section aria-labelledby="planning-titre" className="card p-5">
          <h2 id="planning-titre" className="font-display text-xl font-semibold text-encre mb-2">
            Dans le planning
          </h2>
          <AddPlanToPlanning
            slug={doc.slug}
            count={tasks.length}
            from={tasks.reduce((m, t) => (t.date < m ? t.date : m), tasks[0].date)}
            to={tasks.reduce((m, t) => (t.date > m ? t.date : m), tasks[0].date)}
          />
        </section>
      )}

      {doc.sections.map((s) => (
        <section key={s.title} className="space-y-3 border-t border-trait pt-6">
          <h2 className="font-display text-2xl font-semibold text-encre">{s.title}</h2>
          {s.blocks.map((b, i) => (
            <Block key={i} block={b} />
          ))}
        </section>
      ))}
    </div>
  );
}
