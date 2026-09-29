import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import PasswordChangeForm from "@/components/PasswordChangeForm";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

// Changement de mot de passe : imposé à la première connexion d'un client
// (le mot de passe reçu par email ne doit servir qu'une fois).
export default async function PasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const formal = user.role === "CLIENT";
  const forced = user.must_change_password;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <Logo size={32} className="text-encre" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-encre">
            {forced ? "Choisissez votre mot de passe" : "Changer de mot de passe"}
          </h1>
          {forced && (
            <p className="text-pierre text-sm mt-1">
              Pour protéger votre espace, remplacez le mot de passe reçu par email par un mot de passe
              que vous seul connaissez.
            </p>
          )}
        </div>
        <PasswordChangeForm forced={forced} formal={formal} />
      </div>
    </div>
  );
}
