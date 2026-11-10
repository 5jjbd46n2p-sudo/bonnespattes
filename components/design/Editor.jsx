"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ActiveSelection, Canvas, Point, StaticCanvas } from "fabric";
import {
  ArrowLeft,
  CheckCircle,
  CircleNotch,
  CloudSlash,
  CornersOut,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  Warning,
} from "@phosphor-icons/react";
import { FACE_LABELS, SERIALIZE_PROPS, getFormat, isOutsideSafe } from "@/lib/designFormats";
import { browserFontResolver, ensureFontsLoaded, mapPageFonts } from "@/lib/designFonts";
import { EditorContext } from "./EditorContext";
import useHistory from "./useHistory";
import Toolbar from "./Toolbar";
import LeftPanel from "./LeftPanel";
import ExportMenu from "./ExportMenu";
import {
  PAPIER,
  REAL_SIZE_ZOOM,
  applyLock,
  clamp,
  drawGuides,
  isSelection,
  relativizeSrc,
  sanitizeImages,
  sceneBounds,
  snapObject,
  styleControls,
} from "./editor-utils";

const SAVE_DELAY = 1500;
const HISTORY_LIMIT = 50;
const WARN_ROLES = new Set(["text", "icon", "qr"]);
const NUDGE = 10; // 1 mm
const NUDGE_BIG = 50; // 5 mm
const PASTE_OFFSET = 50; // 5 mm

const blankPage = () => ({ version: "6", background: PAPIER, objects: [] });

function initialPages(design, faces) {
  const src = Array.isArray(design.pages) ? design.pages : [];
  return Array.from({ length: faces }, (_, i) => {
    const p = src[i];
    if (!p || typeof p !== "object") return blankPage();
    return { ...p, objects: Array.isArray(p.objects) ? p.objects : [] };
  });
}

export default function Editor({ design, info }) {
  const fmt = useMemo(() => getFormat(design?.format, design?.orientation), [design?.format, design?.orientation]);
  if (!fmt) {
    return (
      <div className="card p-6">
        <h1>Conception</h1>
        <p className="mt-2 text-pierre">Le format de cette conception est inconnu, elle ne peut pas être ouverte.</p>
        <Link href="/admin/conception" className="btn-ghost mt-4">
          Retour à mes conceptions
        </Link>
      </div>
    );
  }
  return <EditorInner design={design} info={info} fmt={fmt} />;
}

function EditorInner({ design, info, fmt }) {
  const designId = design.id;

  // --- État affiché -----------------------------------------------------------
  const [canvas, setCanvas] = useState(null);
  const [faceIndex, setFaceIndexState] = useState(0);
  const [saveState, setSaveState] = useState("saved");
  const [saveError, setSaveError] = useState("");
  const [online, setOnline] = useState(true);
  const [name, setName] = useState(design.name || "Sans titre");
  const [nameDraft, setNameDraft] = useState(design.name || "Sans titre");
  const [nameError, setNameError] = useState("");
  const [active, setActive] = useState(null);
  const [, setTick] = useState(0);
  const [warnCount, setWarnCount] = useState(0);
  const [zoom, setZoom] = useState(null);
  const [fitMode, setFitMode] = useState(true);
  const [readOnly, setReadOnly] = useState(
    () => typeof window !== "undefined" && !window.matchMedia("(min-width: 768px)").matches,
  );
  const [loadError, setLoadError] = useState("");

  const history = useHistory(HISTORY_LIMIT);
  const historyRef = useRef(history);
  historyRef.current = history;

  // --- Références (les gestionnaires Fabric lisent toujours la dernière valeur)
  const canvasRef = useRef(null);
  const hostRef = useRef(null);
  const scrollRef = useRef(null);
  const pagesRef = useRef(null);
  if (pagesRef.current === null) pagesRef.current = initialPages(design, fmt.faces);
  const faceRef = useRef(0);
  const loadingRef = useRef(true);
  const loadTokenRef = useRef(0);
  const resolverRef = useRef(null);
  const commitQueuedRef = useRef(false);
  const commitTimerRef = useRef(null);
  const saveTimerRef = useRef(null);
  const retryTimerRef = useRef(null);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const saveAgainRef = useRef(false);
  const thumbRef = useRef(null);
  const clipboardRef = useRef(null);
  const snapLinesRef = useRef([]);
  const warnCountRef = useRef(0);
  const readOnlyRef = useRef(readOnly);
  const fitModeRef = useRef(true);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // --- Polices : nom logique ↔ nom réel ---------------------------------------
  const toStored = useCallback(
    (f) => (typeof f === "string" && resolverRef.current ? resolverRef.current.toStored(f) : f),
    [],
  );
  const toRuntime = useCallback(
    (f) => (typeof f === "string" && resolverRef.current ? resolverRef.current.toRuntime(f) : f),
    [],
  );

  // --- Sérialisation ----------------------------------------------------------
  const serializeCurrent = useCallback(() => {
    const c = canvasRef.current;
    const raw = c.toObject(SERIALIZE_PROPS);
    const page = {
      version: raw.version || "6",
      background:
        typeof raw.background === "string"
          ? raw.background
          : typeof c.backgroundColor === "string"
            ? c.backgroundColor
            : PAPIER,
      objects: Array.isArray(raw.objects) ? raw.objects : [],
    };
    return relativizeSrc(mapPageFonts(page, toStored));
  }, [toStored]);

  const getPages = useCallback(() => {
    const pages = pagesRef.current.slice();
    if (canvasRef.current && !loadingRef.current) pages[faceRef.current] = serializeCurrent();
    return pages;
  }, [serializeCurrent]);

  const prepareObject = useCallback((o) => {
    styleControls(o);
    applyLock(o, o.abpLocked);
  }, []);

  // Charge une face (format stocké) dans le canvas. false si remplacée par un
  // chargement plus récent ou en échec.
  const loadPage = useCallback(
    async (stored) => {
      const c = canvasRef.current;
      if (!c) return false;
      const token = ++loadTokenRef.current;
      loadingRef.current = true;
      try {
        let runtime = mapPageFonts(stored || blankPage(), toRuntime);
        try {
          await c.loadFromJSON(runtime);
        } catch (err) {
          // Image introuvable : on remplace par un emplacement photo et on réessaie.
          console.error("Conception : chargement de la face", err);
          if (token !== loadTokenRef.current) return false;
          runtime = await sanitizeImages(runtime);
          await c.loadFromJSON(runtime);
        }
        if (token !== loadTokenRef.current) return false;
        if (!c.backgroundColor) c.backgroundColor = PAPIER;
        c.getObjects().forEach(prepareObject);
        c.discardActiveObject();
        c.requestRenderAll();
        setActive(null);
        setLoadError("");
        return true;
      } catch (err) {
        console.error("Conception : face illisible", err);
        if (token === loadTokenRef.current) setLoadError("Cette face n'a pas pu être ouverte. Recharge la page.");
        return false;
      } finally {
        if (token === loadTokenRef.current) loadingRef.current = false;
      }
    },
    [toRuntime, prepareObject],
  );

  // --- Vignette (face 0, JPEG 240 px de large, qualité 0,6) ------------------
  const makeThumbnail = useCallback(async () => {
    const c = canvasRef.current;
    try {
      if (c && faceRef.current === 0 && !loadingRef.current) {
        const url = c.toDataURL({ format: "jpeg", quality: 0.6, multiplier: 240 / c.getWidth() });
        thumbRef.current = url;
        return url;
      }
      if (thumbRef.current) return thumbRef.current;
      const el = document.createElement("canvas");
      const sc = new StaticCanvas(el, {
        width: fmt.canvas.w,
        height: fmt.canvas.h,
        enableRetinaScaling: false,
        renderOnAddRemove: false,
      });
      try {
        await sc.loadFromJSON(mapPageFonts(pagesRef.current[0] || blankPage(), toRuntime));
        if (!sc.backgroundColor) sc.backgroundColor = PAPIER;
        sc.renderAll();
        const url = sc.toDataURL({ format: "jpeg", quality: 0.6, multiplier: 240 / fmt.canvas.w });
        thumbRef.current = url;
        return url;
      } finally {
        sc.dispose();
      }
    } catch (err) {
      console.error("Conception : vignette", err);
      return null;
    }
  }, [fmt, toRuntime]);

  // --- Sauvegarde automatique -------------------------------------------------
  const doSaveRef = useRef(null);

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    setSaveState("saving");
    clearTimeout(saveTimerRef.current);
    clearTimeout(retryTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSaveRef.current?.(), SAVE_DELAY);
  }, []);

  // --- Historique et enregistrement -------------------------------------------
  const doCommit = useCallback(() => {
    commitQueuedRef.current = false;
    clearTimeout(commitTimerRef.current);
    commitTimerRef.current = null;
    const c = canvasRef.current;
    if (!c || loadingRef.current || readOnlyRef.current) return;
    const face = faceRef.current;
    const page = serializeCurrent();
    pagesRef.current[face] = page;
    if (historyRef.current.push(face, JSON.stringify(page))) {
      if (face === 0) thumbRef.current = null;
      scheduleSave();
    }
  }, [serializeCurrent, scheduleSave]);

  // Plusieurs appels dans la même tâche (ajout de plusieurs objets…) = un état.
  const commit = useCallback(() => {
    if (commitQueuedRef.current) return;
    commitQueuedRef.current = true;
    queueMicrotask(() => {
      if (commitQueuedRef.current) doCommit();
    });
  }, [doCommit]);

  // Saisie de texte, flèches : un état après une courte pause.
  const commitSoon = useCallback(
    (delay = 500) => {
      clearTimeout(commitTimerRef.current);
      commitTimerRef.current = setTimeout(() => doCommit(), delay);
    },
    [doCommit],
  );

  const flushCommit = useCallback(() => {
    if (commitQueuedRef.current || commitTimerRef.current) doCommit();
  }, [doCommit]);

  const doSave = useCallback(async () => {
    if (savingRef.current) {
      saveAgainRef.current = true;
      return;
    }
    clearTimeout(saveTimerRef.current);
    clearTimeout(retryTimerRef.current);
    flushCommit();
    savingRef.current = true;
    dirtyRef.current = false;
    setSaveState("saving");
    let failed = false;
    let retryDelay = 5000;
    try {
      const pages = getPages();
      const thumbnail = await makeThumbnail();
      const res = await fetch(`/api/designs/${designId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(thumbnail ? { pages, thumbnail } : { pages }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(typeof data?.error === "string" ? data.error : "");
        if (res.status >= 400 && res.status < 500) retryDelay = 30000;
        failed = true;
      } else {
        setSaveError("");
      }
    } catch {
      setSaveError("");
      failed = true;
    }
    savingRef.current = false;
    if (failed) dirtyRef.current = true;
    if (saveAgainRef.current) {
      saveAgainRef.current = false;
      scheduleSave();
      return;
    }
    if (failed) {
      setSaveState("error");
      retryTimerRef.current = setTimeout(() => doSaveRef.current?.(), retryDelay);
    } else if (!dirtyRef.current) {
      setSaveState("saved");
    }
  }, [designId, flushCommit, getPages, makeThumbnail, scheduleSave]);
  doSaveRef.current = doSave;

  // --- API exposée par le contexte --------------------------------------------
  const setFaceIndex = useCallback(
    async (i) => {
      const c = canvasRef.current;
      if (!c || !Number.isInteger(i) || i < 0 || i >= fmt.faces || i === faceRef.current) return;
      flushCommit();
      if (!loadingRef.current) pagesRef.current[faceRef.current] = serializeCurrent();
      faceRef.current = i;
      const ok = await loadPage(pagesRef.current[i]);
      if (!ok || faceRef.current !== i) return;
      if (!historyRef.current.has(i)) historyRef.current.reset(i, JSON.stringify(serializeCurrent()));
      setFaceIndexState(i);
    },
    [fmt.faces, flushCommit, serializeCurrent, loadPage],
  );

  const replaceCurrentPage = useCallback(
    async (page) => {
      if (!canvasRef.current) return false;
      flushCommit();
      const ok = await loadPage(page);
      if (ok) doCommit();
      return ok;
    },
    [flushCommit, loadPage, doCommit],
  );

  const addObject = useCallback(
    (obj, { center = true } = {}) => {
      const c = canvasRef.current;
      if (!c || !obj) return obj;
      if (center) {
        const s = fmt.safeRect;
        obj.setPositionByOrigin(new Point(s.x + s.w / 2, s.y + s.h / 2), "center", "center");
      }
      prepareObject(obj);
      c.add(obj);
      obj.setCoords();
      c.setActiveObject(obj);
      c.requestRenderAll();
      setActive(obj);
      commit();
      return obj;
    },
    [fmt, prepareObject, commit],
  );

  // --- Actions de la barre d'outils et du clavier -----------------------------
  const insertClone = useCallback(
    (cl) => {
      const c = canvasRef.current;
      c.discardActiveObject();
      cl.set({ left: cl.left + PASTE_OFFSET, top: cl.top + PASTE_OFFSET });
      if (isSelection(cl)) {
        cl.canvas = c;
        cl.forEachObject((o) => {
          prepareObject(o);
          c.add(o);
        });
        cl.setCoords();
      } else {
        prepareObject(cl);
        c.add(cl);
      }
      c.setActiveObject(cl);
      c.requestRenderAll();
      setActive(cl);
      commit();
    },
    [prepareObject, commit],
  );

  const copy = useCallback(async () => {
    const a = canvasRef.current?.getActiveObject();
    if (!a) return;
    clipboardRef.current = await a.clone(SERIALIZE_PROPS);
  }, []);

  const paste = useCallback(async () => {
    const src = clipboardRef.current;
    if (!src || !canvasRef.current) return;
    const cl = await src.clone(SERIALIZE_PROPS);
    // Collages successifs : chacun décalé du précédent.
    src.set({ left: src.left + PASTE_OFFSET, top: src.top + PASTE_OFFSET });
    insertClone(cl);
  }, [insertClone]);

  const duplicate = useCallback(async () => {
    const a = canvasRef.current?.getActiveObject();
    if (!a) return;
    const cl = await a.clone(SERIALIZE_PROPS);
    insertClone(cl);
  }, [insertClone]);

  const remove = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const objs = c.getActiveObjects().filter((o) => !o.abpLocked);
    if (!objs.length) return;
    c.discardActiveObject();
    objs.forEach((o) => c.remove(o));
    c.requestRenderAll();
    setActive(null);
    commit();
  }, [commit]);

  const lockSelection = (a) => {
    if (!isSelection(a)) return;
    const l = a.getObjects().some((o) => o.abpLocked);
    a.set({
      lockMovementX: l,
      lockMovementY: l,
      lockScalingX: l,
      lockScalingY: l,
      lockRotation: l,
      hasControls: !l,
    });
  };

  const toggleLock = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const objs = c.getActiveObjects();
    if (!objs.length) return;
    const lock = !objs.every((o) => o.abpLocked);
    objs.forEach((o) => applyLock(o, lock));
    lockSelection(c.getActiveObject());
    c.requestRenderAll();
    refresh();
    commit();
  }, [refresh, commit]);

  const reorder = useCallback(
    (toFront) => {
      const c = canvasRef.current;
      if (!c) return;
      const order = c.getObjects();
      const objs = c.getActiveObjects().sort((a, b) => order.indexOf(a) - order.indexOf(b));
      if (!objs.length) return;
      if (toFront) objs.forEach((o) => c.bringObjectToFront(o));
      else objs.reverse().forEach((o) => c.sendObjectToBack(o));
      c.requestRenderAll();
      commit();
    },
    [commit],
  );

  const nudge = useCallback(
    (dx, dy) => {
      const c = canvasRef.current;
      const a = c?.getActiveObject();
      if (!a || a.lockMovementX || a.lockMovementY) return;
      a.set({ left: a.left + dx, top: a.top + dy });
      a.setCoords();
      c.requestRenderAll();
      commitSoon(400);
    },
    [commitSoon],
  );

  const selectAll = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const objs = c.getObjects().filter((o) => o.selectable !== false && o.visible);
    if (!objs.length) return;
    c.discardActiveObject();
    const sel = new ActiveSelection(objs, { canvas: c });
    lockSelection(sel);
    c.setActiveObject(sel);
    c.requestRenderAll();
    setActive(sel);
  }, []);

  const restore = useCallback(
    async (redo) => {
      const c = canvasRef.current;
      if (!c) return;
      flushCommit();
      const face = faceRef.current;
      const s = redo ? historyRef.current.redo(face) : historyRef.current.undo(face);
      if (s == null) return;
      const page = JSON.parse(s);
      pagesRef.current[face] = page;
      if (face === 0) thumbRef.current = null;
      scheduleSave();
      await loadPage(page);
    },
    [flushCommit, scheduleSave, loadPage],
  );
  const undo = useCallback(() => restore(false), [restore]);
  const redo = useCallback(() => restore(true), [restore]);

  // --- Zoom ----------------------------------------------------------------
  const maxZoom = useMemo(() => {
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    // Garde le canvas sous ~16 millions de pixels (limite Safari).
    const byArea = Math.sqrt(16e6 / (dpr * dpr * fmt.canvas.w * fmt.canvas.h));
    return Math.min(REAL_SIZE_ZOOM * 8, byArea);
  }, [fmt]);
  const minZoom = REAL_SIZE_ZOOM * 0.1;

  const computeFit = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return null;
    const pad = 48;
    const w = el.clientWidth - pad;
    const h = el.clientHeight - pad;
    if (w <= 0 || h <= 0) return null;
    return clamp(Math.min(w / fmt.canvas.w, h / fmt.canvas.h), minZoom, maxZoom);
  }, [fmt, minZoom, maxZoom]);

  useEffect(() => {
    fitModeRef.current = fitMode;
  }, [fitMode]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !zoom) return;
    c.setZoom(zoom);
    c.setDimensions({ width: Math.round(fmt.canvas.w * zoom), height: Math.round(fmt.canvas.h * zoom) });
    c.requestRenderAll();
  }, [zoom, canvas, fmt]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (!fitModeRef.current) return;
      const z = computeFit();
      if (z) setZoom(z);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [computeFit]);

  const zoomBy = (factor) => {
    setFitMode(false);
    setZoom((z) => clamp((z || REAL_SIZE_ZOOM) * factor, minZoom, maxZoom));
  };
  const zoomFit = () => {
    setFitMode(true);
    const z = computeFit();
    if (z) setZoom(z);
  };
  const zoomReal = () => {
    setFitMode(false);
    setZoom(clamp(REAL_SIZE_ZOOM, minZoom, maxZoom));
  };

  // --- Création du canvas Fabric et premier chargement ------------------------
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let disposed = false;
    // Élément neuf à chaque montage (double montage du mode strict de React).
    const el = document.createElement("canvas");
    host.appendChild(el);
    const z0 = computeFit() || 0.5;
    const c = new Canvas(el, {
      width: Math.round(fmt.canvas.w * z0),
      height: Math.round(fmt.canvas.h * z0),
      backgroundColor: PAPIER,
      preserveObjectStacking: true,
      selectionColor: "rgba(168, 72, 31, 0.08)",
      selectionBorderColor: "#a8481f",
      selectionLineWidth: 1,
      stopContextMenu: true,
      selection: !readOnlyRef.current,
      skipTargetFind: readOnlyRef.current,
    });
    c.setZoom(z0);
    canvasRef.current = c;

    const offs = [];
    const on = (eventName, handler) => {
      const off = c.on(eventName, handler);
      if (typeof off === "function") offs.push(off);
      else offs.push(() => c.off(eventName, handler));
    };

    const onSelection = () => {
      const a = c.getActiveObject();
      lockSelection(a);
      setActive(a || null);
      refresh();
    };

    on("object:added", ({ target }) => {
      if (target) prepareObject(target);
      if (!loadingRef.current) commit();
    });
    on("object:removed", () => {
      if (!loadingRef.current) commit();
    });
    on("object:modified", () => {
      snapLinesRef.current = [];
      commit();
      refresh();
    });
    on("text:changed", () => commitSoon(600));
    on("text:editing:exited", () => commit());
    on("object:moving", (e) => {
      if (readOnlyRef.current || !e.target) return;
      if (e.e && e.e.altKey) {
        snapLinesRef.current = [];
        return;
      }
      snapLinesRef.current = snapObject(c, e.target, fmt);
    });
    on("mouse:up", () => {
      if (snapLinesRef.current.length) {
        snapLinesRef.current = [];
        c.requestRenderAll();
      }
    });
    on("selection:created", onSelection);
    on("selection:updated", onSelection);
    on("selection:cleared", () => {
      setActive(null);
      refresh();
    });
    // Repères et alertes, redessinés à chaque rendu sur le contexte supérieur.
    on("after:render", () => {
      const ctx = c.contextTop;
      if (!ctx) return;
      const warnings = [];
      for (const o of c.getObjects()) {
        if (!o.visible || !WARN_ROLES.has(o.abpRole)) continue;
        const b = sceneBounds(o);
        if (isOutsideSafe(b, fmt)) warnings.push(b);
      }
      if (warnings.length !== warnCountRef.current) {
        warnCountRef.current = warnings.length;
        setWarnCount(warnings.length);
      }
      drawGuides(ctx, fmt, c.viewportTransform, { warnings, snapLines: snapLinesRef.current });
      // Le prochain rendu complet efface le contexte supérieur avant de redessiner.
      c.contextTopDirty = true;
    });

    (async () => {
      try {
        await ensureFontsLoaded();
      } catch {
        // Police indisponible : on ouvre quand même, avec la police de repli.
      }
      if (disposed) return;
      resolverRef.current = browserFontResolver();
      const ok = await loadPage(pagesRef.current[0]);
      if (disposed) return;
      if (ok) historyRef.current.reset(0, JSON.stringify(serializeCurrent()));
      setZoom(z0);
      setCanvas(c);
    })();

    return () => {
      disposed = true;
      // Modifications pas encore envoyées : dernier envoi en quittant l'éditeur.
      clearTimeout(saveTimerRef.current);
      clearTimeout(retryTimerRef.current);
      clearTimeout(commitTimerRef.current);
      if ((commitQueuedRef.current || commitTimerRef.current || dirtyRef.current) && !loadingRef.current) {
        try {
          const pages = getPages();
          fetch(`/api/designs/${designId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pages }),
          }).catch(() => {});
        } catch {
          // canvas déjà inutilisable : rien à envoyer
        }
      }
      commitQueuedRef.current = false;
      dirtyRef.current = false;
      offs.forEach((off) => off());
      canvasRef.current = null;
      setCanvas(null);
      Promise.resolve(c.dispose())
        .catch(() => {})
        .finally(() => {
          if (el.parentNode) el.parentNode.removeChild(el);
        });
    };
    // Montage unique : toutes les fonctions utilisées sont stables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Lecture seule sous md --------------------------------------------------
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setReadOnly(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    readOnlyRef.current = readOnly;
    const c = canvasRef.current;
    if (!c) return;
    c.selection = !readOnly;
    c.skipTargetFind = readOnly;
    if (readOnly) c.discardActiveObject();
    const touch = readOnly ? "auto" : "none";
    if (c.upperCanvasEl) c.upperCanvasEl.style.touchAction = touch;
    if (c.wrapperEl) c.wrapperEl.style.touchAction = touch;
    c.requestRenderAll();
  }, [readOnly, canvas]);

  // --- Raccourcis clavier -------------------------------------------------------
  useEffect(() => {
    if (readOnly) return undefined;
    const onKey = (e) => {
      const c = canvasRef.current;
      if (!c || e.defaultPrevented) return;
      const t = e.target;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      const a = c.getActiveObject();
      if (a && a.isEditing) return;
      const mod = e.ctrlKey || e.metaKey;
      const k = (e.key || "").toLowerCase();
      if (mod) {
        if (k === "z") {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        } else if (k === "y") {
          e.preventDefault();
          redo();
        } else if (k === "c" && a) {
          e.preventDefault();
          copy();
        } else if (k === "v" && clipboardRef.current) {
          e.preventDefault();
          paste();
        } else if (k === "d" && a) {
          e.preventDefault();
          duplicate();
        } else if (k === "a") {
          e.preventDefault();
          selectAll();
        }
        return;
      }
      if (!a) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        remove();
        return;
      }
      if (e.key === "Escape") {
        c.discardActiveObject();
        c.requestRenderAll();
        return;
      }
      const step = e.shiftKey ? NUDGE_BIG : NUDGE;
      const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (moves[e.key]) {
        e.preventDefault();
        nudge(moves[e.key][0], moves[e.key][1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readOnly, undo, redo, copy, paste, duplicate, selectAll, remove, nudge]);

  // --- Hors ligne, fermeture de la page ---------------------------------------
  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine && dirtyRef.current && !savingRef.current) doSaveRef.current?.();
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const beforeUnload = (e) => {
      if (dirtyRef.current || savingRef.current || commitQueuedRef.current || commitTimerRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, []);

  // --- Nom ------------------------------------------------------------------------
  const saveName = async () => {
    const v = nameDraft.trim().slice(0, 80);
    if (!v) {
      setNameDraft(name);
      return;
    }
    if (v === name) return;
    const previous = name;
    setName(v);
    setNameDraft(v);
    setNameError("");
    try {
      const res = await fetch(`/api/designs/${designId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: v }),
      });
      if (!res.ok) throw new Error("name");
    } catch {
      setName(previous);
      setNameDraft(previous);
      setNameError("Nom non enregistré, réessaie.");
    }
  };

  // --- Contexte -------------------------------------------------------------------
  const ctxValue = useMemo(
    () => ({
      canvas,
      fmt,
      design: { id: designId, name, format: design.format, orientation: design.orientation || fmt.orientation },
      info,
      faceIndex,
      setFaceIndex,
      addObject,
      commit,
      getPages,
      replaceCurrentPage,
      saveState,
    }),
    [
      canvas,
      fmt,
      designId,
      name,
      design.format,
      design.orientation,
      info,
      faceIndex,
      setFaceIndex,
      addObject,
      commit,
      getPages,
      replaceCurrentPage,
      saveState,
    ],
  );

  const actions = {
    undo,
    redo,
    canUndo: history.canUndo(faceIndex),
    canRedo: history.canRedo(faceIndex),
    duplicate,
    remove,
    toggleLock,
    bringFront: () => reorder(true),
    sendBack: () => reorder(false),
  };

  const zoomPct = zoom ? Math.round((zoom / REAL_SIZE_ZOOM) * 100) : null;

  return (
    <EditorContext.Provider value={ctxValue}>
      <div className="flex h-[calc(100dvh-13rem)] min-h-[420px] flex-col gap-3 md:h-[calc(100dvh-5rem)] md:min-h-[560px]">
        {/* Barre du haut : retour, nom, état d'enregistrement, téléchargement */}
        <header className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/conception"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-trait text-encre hover:bg-sable"
            aria-label="Retour à mes conceptions"
            title="Mes conceptions"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0 flex-1 md:max-w-md">
            {readOnly ? (
              <h1 className="truncate text-xl md:text-2xl">{name}</h1>
            ) : (
              <input
                className="input font-display text-lg"
                value={nameDraft}
                maxLength={80}
                aria-label="Nom de la conception"
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") {
                    setNameDraft(name);
                    e.currentTarget.blur();
                  }
                }}
              />
            )}
            {nameError && <p className="mt-1 text-sm text-brique">{nameError}</p>}
          </div>
          <span className="label hidden sm:inline">
            {fmt.label} · {fmt.trimMm.w} × {fmt.trimMm.h} mm
          </span>
          <SaveIndicator state={saveState} online={online} error={saveError} />
          <div className="ml-auto">
            <ExportMenu />
          </div>
        </header>

        {/* Trois zones : panneau gauche, toile, barre contextuelle */}
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border border-trait bg-lin">
          <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto border-r border-trait md:flex">
            {canvas && <LeftPanel />}
          </aside>
          <section className="flex min-w-0 flex-1 flex-col">
            {!readOnly && canvas && (
              <Toolbar active={active} refresh={refresh} resolver={resolverRef.current} actions={actions} />
            )}
            <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto bg-sable">
              <div className="flex min-h-full min-w-full w-max p-6">
                <div ref={hostRef} className="m-auto" />
              </div>
              {!canvas && !loadError && (
                <div className="absolute inset-0 flex items-center justify-center text-pierre">Chargement…</div>
              )}
              {loadError && (
                <div className="absolute inset-x-4 top-4 rounded-lg border border-trait bg-lin p-3 text-sm text-brique">
                  {loadError}
                </div>
              )}
            </div>
            <footer className="flex flex-wrap items-center gap-3 border-t border-trait bg-lin px-3 py-2">
              {fmt.faces > 1 && (
                <div role="tablist" aria-label="Faces" className="flex gap-1">
                  {Array.from({ length: fmt.faces }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      role="tab"
                      aria-selected={faceIndex === i}
                      disabled={!canvas}
                      onClick={() => setFaceIndex(i)}
                      className={`h-9 rounded-lg px-3 text-sm font-bold ${
                        faceIndex === i ? "bg-rouille text-sur-rouille" : "text-encre hover:bg-sable"
                      }`}
                    >
                      {FACE_LABELS[i] || `Face ${i + 1}`}
                    </button>
                  ))}
                </div>
              )}
              {warnCount > 0 && (
                <p className="flex items-center gap-1.5 text-sm font-bold text-rouille" role="status">
                  <Warning size={18} aria-hidden="true" />
                  Ce texte risque d&apos;être coupé
                  <span className="hidden font-normal text-pierre lg:inline">
                    : ramène-le à l&apos;intérieur du trait fin vert.
                  </span>
                </p>
              )}
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-sable"
                  aria-label="Dézoomer"
                  title="Dézoomer"
                  onClick={() => zoomBy(1 / 1.25)}
                >
                  <MagnifyingGlassMinus size={20} />
                </button>
                <span className="w-14 text-center text-sm text-encre num" aria-live="polite">
                  {zoomPct != null ? `${zoomPct} %` : ""}
                </span>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-sable"
                  aria-label="Zoomer"
                  title="Zoomer"
                  onClick={() => zoomBy(1.25)}
                >
                  <MagnifyingGlassPlus size={20} />
                </button>
                <button
                  type="button"
                  className={`flex h-9 items-center gap-1 rounded-lg px-2 text-sm ${
                    fitMode ? "bg-sable font-bold" : "hover:bg-sable"
                  }`}
                  aria-label="Ajuster à la fenêtre"
                  title="Ajuster à la fenêtre"
                  onClick={zoomFit}
                >
                  <CornersOut size={18} aria-hidden="true" />
                  <span className="hidden lg:inline">Ajuster</span>
                </button>
                <button
                  type="button"
                  className="h-9 rounded-lg px-2 text-sm hover:bg-sable"
                  aria-label="Taille réelle (100 %)"
                  title="Taille réelle"
                  onClick={zoomReal}
                >
                  100 %
                </button>
              </div>
            </footer>
          </section>
        </div>
        {readOnly && (
          <p className="text-sm text-pierre">Modification sur ordinateur. Ici, tu peux voir les faces et télécharger.</p>
        )}
      </div>
    </EditorContext.Provider>
  );
}

function SaveIndicator({ state, online, error }) {
  let content;
  if (state === "saving") {
    content = (
      <>
        <CircleNotch size={18} className="animate-spin" aria-hidden="true" />
        Enregistrement…
      </>
    );
  } else if (state === "error") {
    content = (
      <>
        <CloudSlash size={18} className="text-brique" aria-hidden="true" />
        <span className="text-brique">{online ? "Non enregistré, nouvelle tentative…" : "Hors ligne, non enregistré"}</span>
      </>
    );
  } else {
    content = (
      <>
        <CheckCircle size={18} className="text-mousse" aria-hidden="true" />
        Enregistré
      </>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-sm text-pierre" aria-live="polite" title={error || undefined}>
      {content}
    </span>
  );
}
