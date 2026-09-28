import { query } from "@/lib/db";
import SettingsForm, { LegalSettingsForm } from "@/components/SettingsForm";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { rows } = await query("SELECT * FROM settings LIMIT 1");
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-display text-3xl font-bold text-forest-dark">Réglages</h1>

      <div className="card p-5">
        <h2 className="font-display text-lg font-bold mb-1">Apparence</h2>
        <p className="text-sm text-muted mb-3">
          « Auto » suit le mode clair/sombre de ton téléphone ou de ton ordinateur.
        </p>
        <ThemeToggle />
      </div>

      <SettingsForm settings={rows[0]} />
      <LegalSettingsForm settings={rows[0]} />

      <div className="card p-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Compte</h2>
          <p className="text-sm text-muted">Déconnexion de cet appareil.</p>
        </div>
        <LogoutButton />
      </div>
    </div>
  );
}
