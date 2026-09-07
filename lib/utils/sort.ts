export type SortDirection = "asc" | "desc" | null;

export function sortRows<T extends Record<string, unknown>>(
  rows: T[],
  key: string | null,
  direction: SortDirection
): T[] {
  if (!key || !direction) return rows;
  return [...rows].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    let cmp = 0;
    if (typeof aVal === "number" && typeof bVal === "number") cmp = aVal - bVal;
    else cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""));
    return direction === "asc" ? cmp : -cmp;
  });
}

// Toggles: none -> asc -> desc -> none, matching common table UX.
export function nextSortState(
  currentKey: string | null,
  currentDir: SortDirection,
  clickedKey: string
): { key: string | null; direction: SortDirection } {
  if (currentKey !== clickedKey) return { key: clickedKey, direction: "asc" };
  if (currentDir === "asc") return { key: clickedKey, direction: "desc" };
  return { key: null, direction: null };
}
