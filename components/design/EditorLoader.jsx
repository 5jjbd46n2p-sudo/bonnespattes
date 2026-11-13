"use client";

import dynamic from "next/dynamic";

// Fabric.js ne fonctionne que dans le navigateur : l'éditeur est chargé sans
// rendu serveur, et seulement sur cette page.
const Editor = dynamic(() => import("./Editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[60dvh] items-center justify-center rounded-lg border border-trait bg-sable text-pierre">
      Chargement de l&apos;éditeur…
    </div>
  ),
});

export default function EditorLoader({ design, info }) {
  return <Editor design={design} info={info} />;
}
