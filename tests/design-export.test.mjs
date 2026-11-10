import { test, expect } from "bun:test";
import { coverCrop, fitScale, pngMultiplier, exportFileName, renderRect, dataUrlToBytes } from "../lib/designExport.js";
import { isQrPlaceholder, isQrObject, qrPlaceholderBox, pageQrPlaceholders, parseQrText } from "../lib/designQr.js";
import { getFormat } from "../lib/designFormats.js";

test("coverCrop : image plus large que le cadre, rognée sur les côtés", () => {
  const c = coverCrop(2000, 1000, 300, 300);
  expect(c.scale).toBeCloseTo(0.3);
  expect(c.width).toBeCloseTo(1000);
  expect(c.height).toBeCloseTo(1000);
  expect(c.cropX).toBeCloseTo(500);
  expect(c.cropY).toBeCloseTo(0);
  expect(c.width * c.scale).toBeCloseTo(300);
  expect(c.height * c.scale).toBeCloseTo(300);
});

test("coverCrop : image haute dans un cadre large", () => {
  const c = coverCrop(1000, 3000, 600, 200);
  expect(c.scale).toBeCloseTo(0.6);
  expect(c.width).toBeCloseTo(1000);
  expect(c.cropX).toBeCloseTo(0);
  expect(c.height * c.scale).toBeCloseTo(200);
  expect(c.cropY).toBeCloseTo((3000 - 200 / 0.6) / 2);
});

test("coverCrop : valeurs nulles sans division par zéro", () => {
  const c = coverCrop(0, 0, 0, 0);
  expect(Number.isFinite(c.scale)).toBe(true);
});

test("fitScale", () => {
  expect(fitScale(2000, 1000, 400)).toBeCloseTo(0.2);
  expect(fitScale(0, 0, 400)).toBe(1);
});

test("pngMultiplier : 2× pour la carte, plafonné pour l'A4", () => {
  expect(pngMultiplier(getFormat("CARTE"))).toBe(2);
  const a4 = getFormat("A4");
  const m = pngMultiplier(a4);
  expect(m).toBeLessThan(2);
  expect(Math.round(a4.trimRect.h * m)).toBe(4000);
});

test("renderRect : coupe ou face entière", () => {
  const f = getFormat("CARTE");
  expect(renderRect(f, false)).toEqual({ x: 0, y: 0, w: 880, h: 580 });
  expect(renderRect(f, true)).toEqual({ x: 15, y: 15, w: 850, h: 550 });
});

test("exportFileName", () => {
  expect(exportFileName("Carte Aurore", "-vistaprint.pdf")).toBe("Carte Aurore-vistaprint.pdf");
  expect(exportFileName('a/b:c*"d', ".png")).toBe("a b c d.png");
  expect(exportFileName("   ", ".png")).toBe("conception.png");
  expect(exportFileName(null)).toBe("conception");
});

test("dataUrlToBytes", () => {
  expect(Array.from(dataUrlToBytes("data:image/png;base64,AAEC/w=="))).toEqual([0, 1, 2, 255]);
});

test("isQrPlaceholder / isQrObject", () => {
  expect(isQrPlaceholder({ type: "Rect", abpRole: "qr", abpQrText: "x" })).toBe(true);
  expect(isQrPlaceholder({ type: "rect", abpRole: "qr" })).toBe(true);
  expect(isQrPlaceholder({ type: "Group", abpRole: "qr" })).toBe(false);
  expect(isQrPlaceholder({ type: "Rect", abpRole: "photo" })).toBe(false);
  expect(isQrPlaceholder(null)).toBe(false);
  expect(isQrObject({ type: "Group", abpRole: "qr" })).toBe(true);
});

test("qrPlaceholderBox : origine haut-gauche, carré inscrit centré", () => {
  const b = qrPlaceholderBox({ left: 100, top: 50, width: 200, height: 160, scaleX: 1, scaleY: 1 });
  expect(b).toEqual({ cx: 200, cy: 130, size: 160, angle: 0 });
});

test("qrPlaceholderBox : origine centrée et échelle", () => {
  const b = qrPlaceholderBox({ left: 300, top: 300, width: 100, height: 100, scaleX: 2, scaleY: 1.5, originX: "center", originY: "center" });
  expect(b.cx).toBeCloseTo(300);
  expect(b.cy).toBeCloseTo(300);
  expect(b.size).toBeCloseTo(150);
});

test("qrPlaceholderBox : rotation de 90° autour du coin", () => {
  const b = qrPlaceholderBox({ left: 0, top: 0, width: 100, height: 100, angle: 90 });
  expect(b.cx).toBeCloseTo(-50);
  expect(b.cy).toBeCloseTo(50);
});

test("pageQrPlaceholders", () => {
  const page = { objects: [{ type: "Rect", abpRole: "qr", abpQrText: "https://a.fr" }, { type: "Textbox", abpRole: "text" }] };
  expect(pageQrPlaceholders(page)).toHaveLength(1);
  expect(pageQrPlaceholders(null)).toEqual([]);
});

test("parseQrText", () => {
  expect(parseQrText("  https://a.fr ")).toEqual({ value: "https://a.fr" });
  expect(parseQrText("").error).toBeTruthy();
  expect(parseQrText("x".repeat(501)).error).toBeTruthy();
});
