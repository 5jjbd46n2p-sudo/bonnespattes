// Vrai type d'une image d'après ses premiers octets (« octets magiques ») :
// le type annoncé par le navigateur se falsifie facilement.
// Renvoie "image/jpeg" | "image/png" | "image/webp" | "image/heic" | null.
const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1", "heif"]);

function ascii(bytes, start, end) {
  return String.fromCharCode(...bytes.slice(start, end));
}

export function sniffImageType(bytes) {
  if (!bytes || bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  if (ascii(bytes, 4, 8) === "ftyp" && HEIF_BRANDS.has(ascii(bytes, 8, 12))) return "image/heic";
  return null;
}

// Le type détecté correspond-il au type annoncé ? (HEIC et HEIF = même famille)
export function matchesDeclaredType(sniffed, declared) {
  if (!sniffed) return false;
  const family = (t) => (t === "image/heif" ? "image/heic" : t);
  return family(sniffed) === family(declared);
}
