import { NavigationArrow } from "@phosphor-icons/react/ssr";
import { wazeUrl } from "@/lib/utils";

export default function WazeLink({ address, className = "" }) {
  const url = wazeUrl(address);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-sm font-bold text-rouille hover:text-rouille-fonce underline underline-offset-4 ${className}`}
    >
      <NavigationArrow size={20} aria-hidden="true" />
      Ouvrir dans Waze
    </a>
  );
}
