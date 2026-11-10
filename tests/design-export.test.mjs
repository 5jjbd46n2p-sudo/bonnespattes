import { test, expect } from "bun:test";
import { coverCrop, fitScale, pngMultiplier, exportFileName, renderRect, dataUrlToBytes, pdfPageSize } from "../lib/designExport.js";
import { isQrPlaceholder, isQrObject, qrPlaceholderBox, pageQrPlaceholders, parseQrText, qrPathData } from "../lib/designQr.js";
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

test("qrPathData : suites horizontales fusionnées", () => {
  const grid = [
    [1, 1, 0],
    [0, 1, 1],
    [1, 0, 1],
  ];
  const modules = { size: 3, get: (r, c) => grid[r][c] };
  expect(qrPathData(modules)).toBe("M0 0h2v1h-2zM1 1h2v1h-2zM0 2h1v1h-1zM2 2h1v1h-1z");
  expect(qrPathData({ size: 0, get: () => 0 })).toBe("");
});

test("pdfPageSize : carte 88 × 58 mm → 249,4 × 164,4 pt", () => {
  const { w, h } = pdfPageSize(getFormat("CARTE"));
  expect(w).toBeCloseTo(249.4, 1);
  expect(h).toBeCloseTo(164.4, 1);
});

// pdf-lib n'est pas installé dans le bac à sable : test sauté si l'import échoue.
let pdfLib = null;
try {
  pdfLib = await import("pdf-lib");
} catch {
  pdfLib = null;
}

// PNG 1 × 1 transparent : image factice à la place du rendu 300 dpi.
const TINY_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

test.skipIf(!pdfLib)("PDF carte : deux pages de 249,4 × 164,4 pt, image pleine page", async () => {
  const fmt = getFormat("CARTE");
  const { PDFDocument } = pdfLib;
  const doc = await PDFDocument.create();
  const { w, h } = pdfPageSize(fmt);
  for (let i = 0; i < fmt.faces; i++) {
    const img = await doc.embedPng(dataUrlToBytes(TINY_PNG));
    const p = doc.addPage([w, h]);
    p.drawImage(img, { x: 0, y: 0, width: w, height: h });
  }
  const reloaded = await PDFDocument.load(await doc.save());
  expect(reloaded.getPageCount()).toBe(2);
  for (const page of reloaded.getPages()) {
    const size = page.getSize();
    expect(size.width).toBeCloseTo(249.4, 1);
    expect(size.height).toBeCloseTo(164.4, 1);
  }
});
