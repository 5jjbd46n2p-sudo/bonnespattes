import Link from "next/link";
import Logo from "@/components/Logo";
import ActivationForm from "./ActivationForm";
import { looksLikeActivationToken } from "@/lib/activation";
import { findUsableActivation } from "@/lib/activationStore";
import { PASSWORD_MIN_LENGTH } from "@/lib/security";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Activer votre espace — Aux Bonnes Pattes",
  robots: { index: false, follow: false },
};

// Page ouverte depuis le lien d'activation reçu par e-mail : le client choisit
// son mot de passe. Le lien n'est consommé qu'à l'envoi du formulaire.
export default async function ActivationPage({ params }) {
  const { token } = await params;
  let activation = null;
  if (looksLikeActivationToken(token)) {
    try {
      activation = await findUsableActivation(token);
    } catch (e) {
      console.error("/activer/[token] :", e?.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-papier">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <Logo size={32} className="text-encre" />
        </div>
        {activation ? (
          <>
            <div>
              <h1 className="font-display text-2xl font-semibold text-encre">Choisissez votre mot de passe</h1>
              <p className="text-pierre text-sm mt-1">
                Il protège votre espace client, où vous retrouverez les comptes rendus, les photos et vos factures.
              </p>
            </div>
            <ActivationForm token={token} email={activation.email} minLength={PASSWORD_MIN_LENGTH} />
          </>
        ) : (
          <div className="space-y-3">
            <h1 className="font-display text-2xl font-semibold text-encre">Ce lien n&apos;est plus valide</h1>
            <p className="text-pierre">
              Il a déjà servi ou il a expiré (il fonctionne 72 heures). Répondez à l&apos;e-mail d&apos;Aurore pour
              recevoir un nouveau lien. Si vous avez déjà choisi votre mot de passe, connectez-vous simplement.
            </p>
            <Link href="/login" className="btn-primary w-full">
              Se connecter
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
