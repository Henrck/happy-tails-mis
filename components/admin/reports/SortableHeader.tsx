"use client";
// Reusable sortable column header, used by Report Management (light
// header row — white bg, dark text) AND Inventory (pink header row,
// white text). The `variant` prop controls which color scheme applies,
// since a shared component can't assume its background color.
export type SortDirection = "asc" | "desc" | null;

export default function SortableHeader({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort,
  variant = "dark",
}: {
  label: string;
  sortKey: string;
  activeSortKey: string | null;
  direction: SortDirection;
  onSort: (key: string) => void;
  variant?: "dark" | "light";
}) {
  const isActive = activeSortKey === sortKey;
  const isLight = variant === "light";

  const textClass = isLight
    ? "text-white hover:text-white/80"
    : `hover:text-zinc-700 ${isActive ? "text-zinc-800" : "text-zinc-500"}`;

  const arrowActiveClass = isLight ? "text-white" : "text-[#FF5F9E]";
  const arrowInactiveClass = isLight ? "text-white/40" : "text-zinc-300";

  return (
    <th className={`text-left font-semibold px-5 py-3 whitespace-nowrap ${isLight ? "" : "text-zinc-500"}`}>
      <button onClick={() => onSort(sortKey)} className={`flex items-center gap-1 transition-colors ${textClass}`}>
        {label}
        <span className="flex flex-col leading-none text-[8px]">
          <span className={isActive && direction === "asc" ? arrowActiveClass : arrowInactiveClass}>▲</span>
          <span className={isActive && direction === "desc" ? arrowActiveClass : arrowInactiveClass}>▼</span>
        </span>
      </button>
    </th>
  );
}
