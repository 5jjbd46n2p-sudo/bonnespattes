import { Navigation } from "lucide-react";
import { wazeUrl } from "@/lib/utils";

export default function WazeLink({ address, className = "" }) {
  const url = wazeUrl(address);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:underline underline-offset-4 ${className}`}
    >
      <Navigation className="w-4 h-4" strokeWidth={1.9} />
      Itinéraire avec Waze
    </a>
  );
}
