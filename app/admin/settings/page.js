import { query } from "@/lib/db";
import SettingsForm, { LegalSettingsForm, PricingSettingsForm, PublicSettingsForm, ContractSettingsForm } from "@/components/SettingsForm";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { rows } = await query("SELECT * FROM settings LIMIT 1");
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-display text-3xl font-semibold text-encre">Réglages</h1>

      <div className="card p-5">
        <h2 className="font-display text-xl font-semibold mb-1">Apparence</h2>
        <p className="text-sm text-pierre mb-3">
          « Auto » suit le mode clair/sombre de ton téléphone ou de ton ordinateur.
        </p>
        <ThemeToggle />
      </div>

      <SettingsForm settings={rows[0]} />
      <PricingSettingsForm settings={rows[0]} />
      <PublicSettingsForm settings={rows[0]} />
      <LegalSettingsForm settings={rows[0]} />
      <ContractSettingsForm settings={rows[0]} />

      <div className="card p-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Compte</h2>
          <p className="text-sm text-pierre">Déconnexion de cet appareil.</p>
        </div>
        <LogoutButton />
      </div>
    </div>
  );
}
