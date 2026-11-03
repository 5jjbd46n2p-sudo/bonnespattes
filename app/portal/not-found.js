import { NotFoundState } from "@/components/PageStates";

export default function NotFound() {
  return (
    <NotFoundState
      title="Cette page n'existe pas."
      text="Le lien est peut-être ancien. Vous retrouverez vos visites, photos et factures dans votre espace."
      links={[{ href: "/portal", label: "Retour à mon espace" }]}
    />
  );
}
