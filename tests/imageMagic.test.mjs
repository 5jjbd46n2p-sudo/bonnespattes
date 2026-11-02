import { test, expect } from "bun:test";
import { sniffImageType } from "../lib/imageMagic.js";

const b = (...parts) => {
  const out = [];
  for (const p of parts) typeof p === "string" ? out.push(...Buffer.from(p, "latin1")) : out.push(...p);
  return new Uint8Array(out);
};

test("jpeg", () => expect(sniffImageType(b([0xff, 0xd8, 0xff, 0xe0], "0000000000"))).toBe("image/jpeg"));
test("png", () => expect(sniffImageType(b([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "0000"))).toBe("image/png"));
test("webp", () => expect(sniffImageType(b("RIFF", [1, 2, 3, 4], "WEBPVP8 "))).toBe("image/webp"));
test("heic", () => expect(sniffImageType(b([0, 0, 0, 0x18], "ftypheic", "0000"))).toBe("image/heic"));
test("heif mif1", () => expect(sniffImageType(b([0, 0, 0, 0x18], "ftypmif1", "0000"))).toBe("image/heic"));
test("gif refusé", () => expect(sniffImageType(b("GIF89a", "000000"))).toBe(null));
test("trop court", () => expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff]))).toBe(null));
test("RIFF non webp (wav) refusé", () => expect(sniffImageType(b("RIFF", [1, 2, 3, 4], "WAVEfmt "))).toBe(null));
