// Finds a year (1950–2099) written in a title, e.g. "2026 אליפות" -> 2026.
export function yearInTitle(title: string): number | null {
  const match = title.match(/(?<!\d)(19[5-9]\d|20\d\d)(?!\d)/);
  return match ? Number(match[1]) : null;
}

// Hebrew-aware alphabetical order (א-ת, then English; numbers compared as numbers).
const collator = new Intl.Collator(["he", "en"], { numeric: true, sensitivity: "base" });

/** The title without its year and the separators around it, for alphabetical sorting. */
function titleWithoutYear(title: string): string {
  return title
    .replace(/(?<!\d)(19[5-9]\d|20\d\d)(?!\d)/, " ")
    .replace(/^[\s\-–—|:,.()]+|[\s\-–—|:,.()]+$/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Sort by the year written in the title, newest first.
 * Items without a year come first, keeping their original order,
 * so they're easy to spot and fix. Within a year: alphabetical by title
 * (ignoring the year itself), then by `date` (newest first), then the original order.
 */
export function sortByTitleYear<T>(
  items: T[],
  getTitle: (item: T) => string,
  getDate?: (item: T) => string | null | undefined,
): T[] {
  return items
    .map((item, index) => ({ item, index, year: yearInTitle(getTitle(item)) }))
    .sort((a, b) => {
      if (a.year === null || b.year === null) {
        if (a.year === null && b.year === null) return a.index - b.index;
        return a.year === null ? -1 : 1;
      }
      if (a.year !== b.year) return b.year - a.year;
      const byTitle = collator.compare(titleWithoutYear(getTitle(a.item)), titleWithoutYear(getTitle(b.item)));
      if (byTitle !== 0) return byTitle;
      const da = getDate?.(a.item) ?? "";
      const db = getDate?.(b.item) ?? "";
      if (da !== db) return db.localeCompare(da);
      return a.index - b.index;
    })
    .map(({ item }) => item);
}
