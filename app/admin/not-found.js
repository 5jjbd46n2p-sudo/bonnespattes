import { NotFoundState } from "@/components/PageStates";

export default function NotFound() {
  return (
    <NotFoundState
      title="Introuvable. Le client ou la visite a peut-être été supprimé."
      links={[
        { href: "/admin", label: "Retour à Aujourd'hui" },
        { href: "/admin/clients", label: "Voir les clients" },
      ]}
    />
  );
}
