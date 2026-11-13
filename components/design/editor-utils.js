"use client";

// Outils du cœur de l'éditeur (navigateur seulement, Fabric v6).
import { ActiveSelection, FabricImage, FabricText, Group, Point, Rect, util } from "fabric";

export const PAPIER = "#f7f2ea";
export const ROUILLE = "#a8481f";
// Taille réelle à l'écran : 96 px CSS par pouce, 10 unités par mm.
export const REAL_SIZE_ZOOM = 96 / 25.4 / 10;
// 1 pt = 25,4 / 72 mm = 3,528 unités.
export const UNITS_PER_PT = (25.4 / 72) * 10;
export const SNAP_UNITS = 30; // aimantation : 3 mm

export const isText = (o) => !!o && o instanceof FabricText;
export const isImage = (o) => !!o && o instanceof FabricImage;
export const isGroup = (o) => !!o && o instanceof Group && !isSelection(o);
export const isSelection = (o) =>
  !!o && (o instanceof ActiveSelection || String(o.type || "").toLowerCase() === "activeselection");
export const isRect = (o) => !!o && o instanceof Rect;

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

// Poignées de sélection aux couleurs du site (non sérialisées).
export function styleControls(obj) {
  obj.set({
    borderColor: ROUILLE,
    cornerColor: "#fffcf7",
    cornerStrokeColor: ROUILLE,
    cornerStyle: "circle",
    transparentCorners: false,
    cornerSize: 10,
    borderScaleFactor: 1.5,
  });
}

// Verrou : l'objet reste sélectionnable (pour le déverrouiller) mais ne bouge plus.
export function applyLock(obj, locked) {
  const l = !!locked;
  obj.set({
    abpLocked: l,
    lockMovementX: l,
    lockMovementY: l,
    lockScalingX: l,
    lockScalingY: l,
    lockRotation: l,
    lockSkewingX: l,
    lockSkewingY: l,
    hasControls: !l,
  });
  if (isText(obj)) obj.editable = !l;
}

// Adresses d'images rendues relatives au site (jamais l'origine en dur).
export function relativizeSrc(page) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const walk = (o) => {
    if (!o || typeof o !== "object") return o;
    const out = { ...o };
    if (typeof out.src === "string" && origin && out.src.startsWith(origin + "/")) {
      out.src = out.src.slice(origin.length);
    }
    if (Array.isArray(out.objects)) out.objects = out.objects.map(walk);
    if (out.clipPath && typeof out.clipPath === "object") out.clipPath = walk(out.clipPath);
    return out;
  };
  return { ...page, objects: Array.isArray(page.objects) ? page.objects.map(walk) : [] };
}

function canLoadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

// Remplace les images introuvables (photo supprimée…) par un emplacement photo
// sable, pour que la face reste ouvrable.
export async function sanitizeImages(page) {
  const objects = Array.isArray(page.objects) ? page.objects : [];
  const out = await Promise.all(
    objects.map(async (o) => {
      if (!o || String(o.type || "").toLowerCase() !== "image" || typeof o.src !== "string") return o;
      if (await canLoadImage(o.src)) return o;
      return {
        type: "Rect",
        version: o.version,
        originX: o.originX,
        originY: o.originY,
        left: o.left,
        top: o.top,
        width: (o.width || 100) * (o.scaleX || 1),
        height: (o.height || 100) * (o.scaleY || 1),
        angle: o.angle || 0,
        fill: "#efe7da",
        abpRole: "photo",
      };
    }),
  );
  return { ...page, objects: out };
}

// Boîte englobante en unités (plan de la scène, sans le zoom).
export function sceneBounds(obj) {
  obj.setCoords();
  const r = obj.getBoundingRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

// Boîte de la partie visible : pour une photo recadrée, le cadre seulement.
export function visibleBounds(obj) {
  if (isImage(obj) && obj.clipPath && !obj.clipPath.absolutePositioned) {
    const f = getPhotoFrame(obj);
    const m = obj.calcTransformMatrix();
    const pts = [
      [-f.cw / 2, -f.ch / 2],
      [f.cw / 2, -f.ch / 2],
      [f.cw / 2, f.ch / 2],
      [-f.cw / 2, f.ch / 2],
    ].map(([x, y]) => util.transformPoint(new Point(f.c.x + x, f.c.y + y), m));
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    return { left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
  }
  return sceneBounds(obj);
}

// --- Photos : cadre (clipPath relatif à l'image) -----------------------------
// Le cadre est un Rect centré sur `c` dans le repère local de l'image (origine
// au centre de l'image). Taille du cadre sur la page : cw × scaleX, ch × scaleY.
export function getPhotoFrame(img) {
  const clip = img.clipPath && !img.clipPath.absolutePositioned ? img.clipPath : null;
  const sx = img.scaleX || 1;
  const sy = img.scaleY || 1;
  let cw = img.width;
  let ch = img.height;
  let c = new Point(0, 0);
  let rx = 0;
  if (clip) {
    cw = (clip.width || 0) * (clip.scaleX || 1);
    ch = (clip.height || 0) * (clip.scaleY || 1);
    c = clip.getCenterPoint();
    rx = (clip.rx || 0) * (clip.scaleX || 1);
  }
  const P = util.transformPoint(c, img.calcTransformMatrix());
  return { cw, ch, c, P, Fw: cw * sx, Fh: ch * sy, radius: rx * sx };
}

// Réglages actuels : zoom ≥ 1 (1 = la photo couvre juste le cadre), décalage
// -1…1 sur chaque axe, rayon des coins en unités sur la page.
export function getPhotoCrop(img) {
  const f = getPhotoFrame(img);
  const iw = img.width || 1;
  const ih = img.height || 1;
  const s0 = Math.max(f.Fw / iw, f.Fh / ih) || 1;
  const zoom = (img.scaleX || 1) / s0;
  const mx = (iw - f.cw) / 2;
  const my = (ih - f.ch) / 2;
  return {
    zoom: Math.max(1, zoom),
    panX: mx > 0.5 ? clamp(f.c.x / mx, -1, 1) : 0,
    panY: my > 0.5 ? clamp(f.c.y / my, -1, 1) : 0,
    radius: f.radius,
  };
}

// Applique zoom / décalage / coins en gardant le cadre fixe sur la page.
export function setPhotoCrop(img, { zoom, panX, panY, radius }) {
  const f = getPhotoFrame(img);
  const iw = img.width || 1;
  const ih = img.height || 1;
  const s0 = Math.max(f.Fw / iw, f.Fh / ih) || 1;
  const s = s0 * clamp(Number(zoom) || 1, 1, 5);
  const cw = f.Fw / s;
  const ch = f.Fh / s;
  const mx = Math.max(0, (iw - cw) / 2);
  const my = Math.max(0, (ih - ch) / 2);
  const c = new Point(clamp(Number(panX) || 0, -1, 1) * mx, clamp(Number(panY) || 0, -1, 1) * my);
  const r = Math.max(0, Number(radius) || 0) / s;
  const clip = new Rect({
    width: cw,
    height: ch,
    left: c.x,
    top: c.y,
    originX: "center",
    originY: "center",
    rx: r,
    ry: r,
    strokeWidth: 0,
    absolutePositioned: false,
  });
  img.set({ scaleX: s, scaleY: s, clipPath: clip });
  const p = util.transformPoint(c, img.calcTransformMatrix());
  img.set({ left: img.left + (f.P.x - p.x), top: img.top + (f.P.y - p.y) });
  img.setCoords();
  img.dirty = true;
}

// --- Couleurs ----------------------------------------------------------------
const NO_PAINT = new Set(["", "none", "transparent"]);
const paints = (v) => typeof v === "string" && !NO_PAINT.has(v.trim().toLowerCase());

// Couleur principale d'un objet (premier enfant peint pour un groupe).
export function getMainColor(obj) {
  if (!obj) return null;
  if (isGroup(obj)) {
    for (const child of obj.getObjects()) {
      const c = getMainColor(child);
      if (c) return c;
    }
    return null;
  }
  if (paints(obj.fill)) return obj.fill;
  if (paints(obj.stroke)) return obj.stroke;
  return null;
}

// Recolore un groupe (icône) : chaque remplissage / contour peint prend la couleur.
export function setGroupColor(group, color) {
  for (const child of group.getObjects()) {
    if (isGroup(child)) {
      setGroupColor(child, color);
      continue;
    }
    if (paints(child.fill)) child.set("fill", color);
    if (paints(child.stroke)) child.set("stroke", color);
  }
  group.dirty = true;
}

// Couleur CSS → #rrggbb pour <input type="color"> (repli encre).
export function toHex(color) {
  if (typeof color !== "string") return "#1f1a15";
  const c = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(c)) return ("#" + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]).toLowerCase();
  const m = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) return "#" + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("");
  return "#1f1a15";
}

// --- Repères (contexte supérieur, jamais exportés) ---------------------------
export function drawGuides(ctx, fmt, vpt, { warnings = [], snapLines = [] } = {}) {
  const z = vpt[0] || 1;
  const { w, h } = fmt.canvas;
  const t = fmt.trimRect;
  const s = fmt.safeRect;
  ctx.save();
  ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);

  // Fond perdu légèrement grisé (quatre bandes autour de la coupe).
  // Effacées avant d'être peintes : le voile reste identique même si le
  // contexte supérieur n'a pas été vidé entre deux rendus.
  const bands = [
    [0, 0, w, t.y],
    [0, t.y + t.h, w, h - (t.y + t.h)],
    [0, t.y, t.x, t.h],
    [t.x + t.w, t.y, w - (t.x + t.w), t.h],
  ];
  ctx.fillStyle = "rgba(31, 26, 21, 0.14)";
  for (const [x, y, bw, bh] of bands) {
    ctx.clearRect(x, y, bw, bh);
    ctx.fillRect(x, y, bw, bh);
  }

  // Trait de coupe en pointillé.
  ctx.lineWidth = 1 / z;
  ctx.strokeStyle = "#1f1a15";
  ctx.setLineDash([6 / z, 4 / z]);
  ctx.strokeRect(t.x, t.y, t.w, t.h);

  // Zone de sécurité, trait fin.
  ctx.setLineDash([]);
  ctx.strokeStyle = "#4f6b3a";
  ctx.strokeRect(s.x, s.y, s.w, s.h);

  // Éléments hors zone de sécurité : contour rouille.
  if (warnings.length) {
    ctx.strokeStyle = ROUILLE;
    ctx.lineWidth = 2 / z;
    const pad = 3 / z;
    for (const b of warnings) {
      ctx.strokeRect(b.left - pad, b.top - pad, b.width + 2 * pad, b.height + 2 * pad);
    }
  }

  // Lignes d'aimantation pendant un déplacement.
  if (snapLines.length) {
    ctx.strokeStyle = ROUILLE;
    ctx.lineWidth = 1 / z;
    ctx.beginPath();
    for (const l of snapLines) {
      if (l.axis === "x") {
        ctx.moveTo(l.pos, 0);
        ctx.lineTo(l.pos, h);
      } else {
        ctx.moveTo(0, l.pos);
        ctx.lineTo(w, l.pos);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}

// Aimantation : centre, bords de coupe, zone de sécurité et autres éléments.
// Déplace `target` et renvoie les lignes à afficher.
export function snapObject(canvas, target, fmt, threshold = SNAP_UNITS) {
  const t = fmt.trimRect;
  const s = fmt.safeRect;
  const xs = [fmt.canvas.w / 2, t.x, t.x + t.w, s.x, s.x + s.w];
  const ys = [fmt.canvas.h / 2, t.y, t.y + t.h, s.y, s.y + s.h];
  const moving = new Set(isSelection(target) ? target.getObjects() : [target]);
  for (const o of canvas.getObjects()) {
    if (moving.has(o) || !o.visible) continue;
    const b = visibleBounds(o);
    xs.push(b.left, b.left + b.width / 2, b.left + b.width);
    ys.push(b.top, b.top + b.height / 2, b.top + b.height);
  }
  const b = visibleBounds(target);
  const best = (edges, targets) => {
    let res = null;
    for (const e of edges) {
      for (const p of targets) {
        const d = p - e;
        if (Math.abs(d) <= threshold && (!res || Math.abs(d) < Math.abs(res.d))) res = { d, pos: p };
      }
    }
    return res;
  };
  const bx = best([b.left, b.left + b.width / 2, b.left + b.width], xs);
  const by = best([b.top, b.top + b.height / 2, b.top + b.height], ys);
  const lines = [];
  if (bx) {
    target.set("left", target.left + bx.d);
    lines.push({ axis: "x", pos: bx.pos });
  }
  if (by) {
    target.set("top", target.top + by.d);
    lines.push({ axis: "y", pos: by.pos });
  }
  if (bx || by) target.setCoords();
  return lines;
}
