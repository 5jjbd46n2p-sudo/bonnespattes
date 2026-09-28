// Logo "Aux Bonnes Pattes" : une maison (la garde se fait à domicile) dont
// l'intérieur porte une empreinte de patte.
export function LogoMark({ className = "w-8 h-8" }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#f2a14a" />
      <path
        d="M9 19.5 20 10l11 9.5V30a1.5 1.5 0 0 1-1.5 1.5h-19A1.5 1.5 0 0 1 9 30z"
        fill="#13304d"
      />
      <ellipse cx="20" cy="25.2" rx="3.6" ry="3" fill="#fff" />
      <ellipse cx="15.6" cy="21.3" rx="1.5" ry="1.9" fill="#fff" />
      <ellipse cx="18.4" cy="19" rx="1.5" ry="1.9" fill="#fff" />
      <ellipse cx="21.6" cy="19" rx="1.5" ry="1.9" fill="#fff" />
      <ellipse cx="24.4" cy="21.3" rx="1.5" ry="1.9" fill="#fff" />
    </svg>
  );
}

export default function Logo({ className = "", markClassName = "w-8 h-8", light = false }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={markClassName} />
      <span className={`font-display font-bold text-[1.05rem] leading-none tracking-tight ${light ? "text-white" : "text-forest-dark"}`}>
        Aux Bonnes Pattes
      </span>
    </span>
  );
}
