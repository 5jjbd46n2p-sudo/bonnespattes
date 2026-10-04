// Les polices standard des PDF (Helvetica) n'acceptent que l'alphabet latin (WinAnsi) :
// un emoji ou un caractère exotique fait planter la génération. On remplace les
// émojis courants par un équivalent texte et on retire le reste.
const REPLACEMENTS = [
  [/[\u{1F600}-\u{1F60F}\u{1F642}\u{1F643}\u{1F60A}\u{263A}]/gu, ":)"],
  [/[\u{1F610}-\u{1F615}]/gu, ":/"],
  [/[\u{2764}\u{1F493}-\u{1F49F}\u{1F90D}-\u{1F90E}]/gu, "<3"],
  [/[\u2018\u2019\u201B]/g, "'"],
  [/[\u201C\u201D\u201F]/g, '"'],
  [/[\u2013\u2014]/g, "-"],
  [/\u2026/g, "..."],
  [/[\u00A0\u202F\u2009]/g, " "],
  [/\u2212/g, "-"],
];

// `font` : police pdf-lib (getCharacterSet donne les caractères encodables).
export function pdfSafe(input, font) {
  let s = String(input ?? "");
  const allowed = font?.getCharacterSet ? new Set(font.getCharacterSet()) : null;
  // Remplacements seulement pour ce que la police ne sait pas écrire
  for (const [re, rep] of REPLACEMENTS) {
    s = s.replace(re, (m) => (allowed && [...m].every((c) => allowed.has(c.codePointAt(0))) ? m : rep));
  }
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp === 10 || cp === 13 || cp === 9) out += ch;
    else if (!allowed || allowed.has(cp)) out += ch;
  }
  return out.replace(/[ ]{2,}/g, " ");
}
