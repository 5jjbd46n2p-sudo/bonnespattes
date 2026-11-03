"use client";

import { useEffect, useState } from "react";

// Barre fixée en bas de l'écran sur mobile : mène au formulaire, et se masque
// quand le formulaire est à l'écran. Absente sur ordinateur (md:hidden).
export default function StickyContactBar() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const target = document.getElementById("contact");
    if (!target || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setHidden(entry.isIntersecting), { threshold: 0.05 });
    io.observe(target);
    return () => io.disconnect();
  }, []);

  return (
    <div
      className={`md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-trait bg-papier px-4 pt-3 transition-transform duration-150 ${hidden ? "translate-y-full" : ""}`}
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      aria-hidden={hidden || undefined}
    >
      <a
        href="#contact"
        tabIndex={hidden ? -1 : undefined}
        className="btn-primary w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rouille"
      >
        Demander un rendez-vous
      </a>
    </div>
  );
}
