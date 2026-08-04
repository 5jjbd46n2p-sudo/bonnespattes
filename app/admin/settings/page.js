import { query } from "@/lib/db";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { rows } = await query("SELECT * FROM settings LIMIT 1");
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-display text-3xl font-semibold text-forest-dark">Réglages</h1>
      <SettingsForm settings={rows[0]} />
    </div>
  );
}
