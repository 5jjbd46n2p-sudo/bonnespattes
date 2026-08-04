import { wazeUrl } from "@/lib/utils";

export default function WazeLink({ address, className = "" }) {
  const url = wazeUrl(address);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:text-forest-dark underline decoration-dotted underline-offset-4 ${className}`}
    >
      🧭 Ouvrir dans Waze
    </a>
  );
}
