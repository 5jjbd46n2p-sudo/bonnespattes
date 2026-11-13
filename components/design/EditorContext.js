"use client";

import { createContext, useContext } from "react";

// Contrat partagé entre le cœur de l'éditeur (Editor.jsx) et les panneaux
// (LeftPanel, ExportMenu). Valeur fournie :
// { canvas, fmt, design, info, faceIndex, setFaceIndex, addObject, commit,
//   getPages, replaceCurrentPage, saveState }
export const EditorContext = createContext(null);

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor() doit être utilisé dans l'éditeur de conception.");
  return ctx;
}

export default EditorContext;
