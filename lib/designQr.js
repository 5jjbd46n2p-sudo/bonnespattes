// QR codes de l'éditeur « Conception » (navigateur uniquement pour la génération).
//
// Les modèles (lib/designTemplates.js) posent un emplacement : un `Rect` avec
// abpRole "qr" et abpQrText. Ici on le remplace par un vrai QR (groupe Fabric :
// carré blanc + un Path des modules sombres, d'après QRCode.create), à la même position et à la même taille, aussi bien
// dans l'éditeur (attachQrSync) qu'à l'export (replaceQrPlaceholders sur le
// StaticCanvas hors écran).
//
// `fabric` et `qrcode` sont importés à la demande : ce fichier reste importable
// dans les tests (fonctions pures) et sur le serveur sans les charger.

export const QR_DARK = "#1f1a15";
export const QR_LIGHT = "#ffffff";
export const QR_MAX_CHARS = 500;

const typeOf = (o) => String(o?.type || "").toLowerCase();

// Emplacement de QR posé par un modèle (objet Fabric vivant ou JSON sérialisé).
export const isQrPlaceholder = (o) => !!o && o.abpRole === "qr" && typeOf(o) === "rect";

// Vrai QR déjà généré (groupe).
export const isQrObject = (o) => !!o && o.abpRole === "qr" && typeOf(o) !== "rect";

const originFactor = (v) => {
  if (typeof v === "number") return v;
  if (v === "center") return 0.5;
  if (v === "right" || v === "bottom") return 1;
  return 0;
};

// Centre, côté (carré inscrit) et angle d'un emplacement, en unités de conception.
// Pur : fonctionne sur un objet vivant comme sur un objet sérialisé.
export function qrPlaceholderBox(o) {
  const w = (Number(o.width) || 0) * (o.scaleX ?? 1);
  const h = (Number(o.height) || 0) * (o.scaleY ?? 1);
  const angle = Number(o.angle) || 0;
  const dx = w * (0.5 - originFactor(o.originX));
  const dy = h * (0.5 - originFactor(o.originY));
  const rad = (angle * Math.PI) / 180;
  const cx = (Number(o.left) || 0) + dx * Math.cos(rad) - dy * Math.sin(rad);
  const cy = (Number(o.top) || 0) + dx * Math.sin(rad) + dy * Math.cos(rad);
  return { cx, cy, size: Math.min(Math.abs(w), Math.abs(h)), angle };
}

// Emplacements de QR d'une face au format stocké (premier niveau seulement).
export const pageQrPlaceholders = (page) => (Array.isArray(page?.objects) ? page.objects.filter(isQrPlaceholder) : []);

// Texte du QR validé : chaîne non vide, longueur raisonnable. Renvoie { value } ou { error }.
export function parseQrText(text) {
  const value = String(text ?? "").trim();
  if (!value) return { error: "Indique l'adresse ou le texte du QR code." };
  if (value.length > QR_MAX_CHARS) return { error: `Texte trop long pour un QR code lisible (${QR_MAX_CHARS} caractères au plus).` };
  return { value };
}

// Chemin SVG des modules sombres : un rectangle par suite horizontale de
// modules sombres (lignes fusionnées), coordonnées en modules (0…size). Pur.
// `modules` = { size, get(row, col) } (forme de QRCode.create(...).modules).
export function qrPathData(modules) {
  const n = modules?.size || 0;
  const parts = [];
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (!modules.get(y, x)) {
        x++;
        continue;
      }
      const start = x;
      while (x < n && modules.get(y, x)) x++;
      parts.push(`M${start} ${y}h${x - start}v1h${start - x}z`);
    }
  }
  return parts.join("");
}

// Matrice du QR (niveau de correction M).
export async function qrModules(text) {
  const { default: QRCode } = await import("qrcode");
  return QRCode.create(String(text), { errorCorrectionLevel: "M" }).modules;
}

// Groupe Fabric du QR centré sur (cx, cy), de côté `size` unités : carré blanc
// (lisible sur un aplat coloré) + un seul Path rempli, sans marge ni liseré.
export async function createQrObject(text, { cx = 0, cy = 0, size = 200, angle = 0 } = {}) {
  const { Group, Path, Rect, Point } = await import("fabric");
  const modules = await qrModules(text);
  const n = modules?.size || 0;
  const d = qrPathData(modules);
  if (!n || !d) throw new Error("QR code illisible.");
  const bg = new Rect({ left: 0, top: 0, width: n, height: n, fill: QR_LIGHT, strokeWidth: 0, originX: "left", originY: "top" });
  const path = new Path(d, { fill: QR_DARK, stroke: null, strokeWidth: 0 });
  path.setPositionByOrigin(new Point(n / 2, n / 2), "center", "center");
  const obj = new Group([bg, path]);
  obj.set({
    scaleX: size / n,
    scaleY: size / n,
    angle,
    abpRole: "qr",
    abpQrText: String(text),
  });
  obj.setPositionByOrigin(new Point(cx, cy), "center", "center");
  obj.setCoords();
  return obj;
}

const COPIED_PROPS = [
  "abpLocked",
  "opacity",
  "selectable",
  "evented",
  "hasControls",
  "lockMovementX",
  "lockMovementY",
  "lockScalingX",
  "lockScalingY",
  "lockRotation",
  "visible",
];

// Remplace `oldObj` par `newObj` au même rang dans la pile. false si `oldObj`
// n'est plus sur la toile (face changée pendant la génération).
export function swapObject(canvas, oldObj, newObj, { copyLocks = true } = {}) {
  const idx = canvas.getObjects().indexOf(oldObj);
  if (idx < 0) return false;
  if (copyLocks) for (const k of COPIED_PROPS) if (oldObj[k] !== undefined) newObj.set(k, oldObj[k]);
  const wasActive = typeof canvas.getActiveObject === "function" && canvas.getActiveObject() === oldObj;
  if (wasActive) canvas.discardActiveObject();
  // Drapeau temporaire : le cœur de l'éditeur ignore ces ajouts/retraits pour
  // l'historique. Jamais sérialisé (retiré aussitôt, absent de SERIALIZE_PROPS).
  oldObj.abpQrSwap = true;
  newObj.abpQrSwap = true;
  try {
    canvas.remove(oldObj);
    canvas.insertAt(idx, newObj);
  } finally {
    delete oldObj.abpQrSwap;
    delete newObj.abpQrSwap;
  }
  if (wasActive) canvas.setActiveObject(newObj);
  return true;
}

// Remplace tous les emplacements de QR d'une toile (Canvas ou StaticCanvas).
// Renvoie le nombre de QR posés.
export async function replaceQrPlaceholders(canvas) {
  const targets = canvas.getObjects().filter(isQrPlaceholder);
  let count = 0;
  for (const ph of targets) {
    const parsed = parseQrText(ph.abpQrText);
    if (parsed.error) continue;
    const qr = await createQrObject(parsed.value, qrPlaceholderBox(ph));
    if (swapObject(canvas, ph, qr)) count++;
  }
  if (count) canvas.requestRenderAll();
  return count;
}

// Éditeur : remplace les emplacements à chaque chargement de face. On écoute
// `object:added` (loadFromJSON ajoute les objets un par un) et l'événement
// maison `abp:page-loaded` si l'éditeur le déclenche ; le travail est regroupé
// (setTimeout 0) et jamais lancé deux fois en parallèle. Plusieurs composants
// peuvent s'abonner : un seul écouteur par toile (compteur de références).
// La substitution ne passe pas par commit() : l'historique n'est pas touché,
// le vrai QR part à la prochaine sauvegarde.
const syncs = new WeakMap();

export function attachQrSync(canvas, { onError } = {}) {
  if (!canvas || typeof canvas.on !== "function") return () => {};
  let entry = syncs.get(canvas);
  if (!entry) {
    let running = false;
    let again = false;
    let timer = null;
    let disposed = false;
    const run = async () => {
      if (disposed) return;
      if (running) {
        again = true;
        return;
      }
      running = true;
      try {
        await replaceQrPlaceholders(canvas);
      } catch (e) {
        console.error("QR code :", e?.message);
        entry?.onError?.(e);
      } finally {
        running = false;
        if (again) {
          again = false;
          schedule();
        }
      }
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(run, 0);
    };
    const onAdded = (e) => {
      if (isQrPlaceholder(e?.target)) schedule();
    };
    canvas.on("object:added", onAdded);
    canvas.on("abp:page-loaded", schedule);
    entry = {
      count: 0,
      schedule,
      onError,
      off() {
        disposed = true;
        clearTimeout(timer);
        canvas.off("object:added", onAdded);
        canvas.off("abp:page-loaded", schedule);
      },
    };
    syncs.set(canvas, entry);
  }
  if (onError && !entry.onError) entry.onError = onError;
  entry.count++;
  entry.schedule();
  const current = entry;
  return () => {
    current.count--;
    if (current.count <= 0) {
      current.off();
      syncs.delete(canvas);
    }
  };
}
