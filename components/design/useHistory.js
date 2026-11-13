"use client";

import { useCallback, useMemo, useRef, useState } from "react";

// Historique annuler / rétablir de l'éditeur, une pile par face.
// Les états sont des chaînes JSON (face au format stocké). `past` contient
// l'état courant en dernier ; `limit` = nombre d'étapes annulables.
export default function useHistory(limit = 50) {
  const stacksRef = useRef(new Map());
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const reset = useCallback(
    (face, state) => {
      stacksRef.current.set(face, { past: [state], future: [] });
      bump();
    },
    [bump],
  );

  const has = useCallback((face) => stacksRef.current.has(face), []);

  // Ajoute un état ; renvoie false s'il est identique à l'état courant.
  const push = useCallback(
    (face, state) => {
      const s = stacksRef.current.get(face);
      if (!s) {
        stacksRef.current.set(face, { past: [state], future: [] });
        bump();
        return true;
      }
      if (s.past[s.past.length - 1] === state) return false;
      s.past.push(state);
      while (s.past.length > limit + 1) s.past.shift();
      s.future = [];
      bump();
      return true;
    },
    [bump, limit],
  );

  // Renvoie l'état à recharger, ou null s'il n'y a rien à annuler.
  const undo = useCallback(
    (face) => {
      const s = stacksRef.current.get(face);
      if (!s || s.past.length < 2) return null;
      s.future.push(s.past.pop());
      bump();
      return s.past[s.past.length - 1];
    },
    [bump],
  );

  const redo = useCallback(
    (face) => {
      const s = stacksRef.current.get(face);
      if (!s || s.future.length === 0) return null;
      const state = s.future.pop();
      s.past.push(state);
      bump();
      return state;
    },
    [bump],
  );

  const canUndo = useCallback((face) => {
    const s = stacksRef.current.get(face);
    return !!s && s.past.length > 1;
  }, []);

  const canRedo = useCallback((face) => {
    const s = stacksRef.current.get(face);
    return !!s && s.future.length > 0;
  }, []);

  return useMemo(
    () => ({ reset, has, push, undo, redo, canUndo, canRedo, version }),
    [reset, has, push, undo, redo, canUndo, canRedo, version],
  );
}
