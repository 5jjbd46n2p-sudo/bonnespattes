"use client";

import { useEffect, useState } from "react";
import { WhatsappLogo } from "@phosphor-icons/react";

// Barre fixée en bas de l'écran sur mobile : mène au formulaire, et se masque
// quand le formulaire est à l'écran. Absente sur ordinateur (md:hidden).
export default function StickyContactBar({ whatsappUrl = null }) {
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
      <div className="flex gap-2">
        <a
          href="#contact"
          tabIndex={hidden ? -1 : undefined}
          className="btn-primary flex-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rouille"
        >
          Demander un rendez-vous
        </a>
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={hidden ? -1 : undefined}
            aria-label="Écrire à Aurore sur WhatsApp"
            className="btn-ghost px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rouille"
          >
            <WhatsappLogo size={24} aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
}
