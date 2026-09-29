import { adminPageGuard } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { formatDateFR } from "@/lib/utils";
import { VisitBillingBadge } from "@/components/StatusBadge";
import WazeLink from "@/components/WazeLink";
import TaskChecklist from "@/components/TaskChecklist";
import PhotoUploader from "@/components/PhotoUploader";
import VisitEditPanel from "@/components/VisitEditPanel";
import { ArrowLeft, MapPin } from "@phosphor-icons/react/ssr";
import { isUuid } from "@/lib/api";

export const dynamic = "force-dynamic";

async function getVisit(id) {
  const visitRes = await query(
    `SELECT v.*, p.name AS pet_name, p.species, p.breed, c.first_name, c.last_name, c.address, i.status AS invoice_status
     FROM visits v JOIN pets p ON p.id = v.pet_id JOIN clients c ON c.id = v.client_id
     LEFT JOIN invoices i ON i.id = v.invoice_id
     WHERE v.id = $1`,
    [id]
  );
  if (!visitRes.rows[0]) return null;
  const tasksRes = await query("SELECT * FROM tasks WHERE visit_id = $1 ORDER BY position, label", [id]);
  const photosRes = await query("SELECT * FROM photos WHERE visit_id = $1 ORDER BY created_at DESC", [id]);
  return { visit: visitRes.rows[0], tasks: tasksRes.rows, photos: photosRes.rows };
}

export default async function VisitDetailPage({ params }) {
  await adminPageGuard();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const data = await getVisit(id);
  if (!data) notFound();
  const { visit, tasks, photos } = data;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href={`/admin/clients/${visit.client_id}`} className="text-sm text-pierre hover:underline inline-flex items-center gap-1">
          <ArrowLeft size={16} aria-hidden="true" />
          {visit.first_name} {visit.last_name}
        </Link>
        <VisitBillingBadge visit={visit} invoiceStatus={visit.invoice_status} />
      </div>

      <div>
        <h1 className="font-display text-3xl font-semibold text-encre">
          {visit.pet_name} · {formatDateFR(visit.date)}
        </h1>
        <p className="text-pierre text-sm mt-1 tabular-nums">
          {visit.first_name} {visit.last_name}
          {visit.start_time && ` · ${visit.start_time.slice(0, 5)}`}
          {visit.end_time && ` – ${visit.end_time.slice(0, 5)}`}
        </p>
        {visit.address && (
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <span className="text-sm inline-flex items-center gap-1">
              <MapPin size={20} aria-hidden="true" className="text-pierre shrink-0" />
              {visit.address}
            </span>
            <WazeLink address={visit.address} />
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-display text-xl font-semibold mb-3">Tâches</h2>
        <TaskChecklist visitId={id} tasks={tasks} />
      </div>

      <div className="card p-5">
        <h2 className="font-display text-xl font-semibold mb-3">Photos</h2>
        <PhotoUploader visitId={id} photos={photos} />
      </div>

      <VisitEditPanel visit={visit} />
    </div>
  );
}
