// Loose Hebrew search: no niqqud, final letters = regular letters (סרטון finds סרטונים),
// quotes ignored (טו = ט"ו), lower-case English. Every word of the query must appear.
const FINAL_LETTERS: Record<string, string> = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, "") // niqqud and cantillation (keeps the maqaf ־ as a separator)
    .replace(/["'`\u05F3\u05F4]/g, "") // quotes, geresh, gershayim: ט"ו = טו
    .replace(/[ךםןףץ]/g, (c) => FINAL_LETTERS[c])
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function queryWords(query: string): string[] {
  return normalize(query).split(" ").filter(Boolean);
}

export function matches(text: string, words: string[]): boolean {
  const t = normalize(text);
  return words.every((w) => t.includes(w));
}
