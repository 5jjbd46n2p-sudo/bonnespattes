import Link from "next/link";
import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { formatDateFR } from "@/lib/utils";
import { VisitStatusBadge } from "@/components/StatusBadge";
import WazeLink from "@/components/WazeLink";
import TaskChecklist from "@/components/TaskChecklist";
import PhotoUploader from "@/components/PhotoUploader";
import VisitEditPanel from "@/components/VisitEditPanel";
import { ChevronLeft, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

async function getVisit(id) {
  const visitRes = await query(
    `SELECT v.*, p.name AS pet_name, p.species, p.breed, c.first_name, c.last_name, c.address
     FROM visits v JOIN pets p ON p.id = v.pet_id JOIN clients c ON c.id = v.client_id
     WHERE v.id = $1`,
    [id]
  );
  if (!visitRes.rows[0]) return null;
  const tasksRes = await query("SELECT * FROM tasks WHERE visit_id = $1 ORDER BY position, label", [id]);
  const photosRes = await query("SELECT * FROM photos WHERE visit_id = $1 ORDER BY created_at DESC", [id]);
  return { visit: visitRes.rows[0], tasks: tasksRes.rows, photos: photosRes.rows };
}

export default async function VisitDetailPage({ params }) {
  const { id } = await params;
  const data = await getVisit(id);
  if (!data) notFound();
  const { visit, tasks, photos } = data;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href={`/admin/clients/${visit.client_id}`} className="text-sm text-muted hover:underline">
          <ChevronLeft className="w-4 h-4 inline -mt-0.5" /> Retour à {visit.first_name} {visit.last_name}
        </Link>
        <VisitStatusBadge status={visit.status} />
      </div>

      <div>
        <h1 className="font-display text-3xl font-bold text-forest-dark">
          {visit.pet_name}
          <span className="block text-lg font-semibold text-muted mt-1">{formatDateFR(visit.date)}</span>
        </h1>
        <p className="text-muted text-sm mt-1">
          {visit.first_name} {visit.last_name}
          {visit.start_time && ` · ${visit.start_time.slice(0, 5)}`}
          {visit.end_time && ` - ${visit.end_time.slice(0, 5)}`}
        </p>
        {visit.address && (
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <span className="text-sm inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4" strokeWidth={1.9} />
              {visit.address}
            </span>
            <WazeLink address={visit.address} />
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-bold text-forest-dark mb-3">Suivi des tâches</h2>
        <TaskChecklist visitId={id} tasks={tasks} />
      </div>

      <div className="card p-5">
        <h2 className="font-bold text-forest-dark mb-3">Photos</h2>
        <PhotoUploader visitId={id} photos={photos} />
      </div>

      <VisitEditPanel visit={visit} />
    </div>
  );
}
