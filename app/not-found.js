import { NotFoundState } from "@/components/PageStates";

// Page introuvable publique : sert aussi pour toute adresse inconnue du site.
export default function NotFound() {
  return (
    <div className="px-4 py-10 max-w-5xl mx-auto w-full">
      <NotFoundState
        title="Cette page n'existe pas (ou plus)."
        text="Le lien est peut-être ancien."
        links={[
          { href: "/", label: "Retour à l'accueil" },
          { href: "/#contact", label: "Demander un rendez-vous" },
        ]}
      />
    </div>
  );
}
