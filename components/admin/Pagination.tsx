"use client";

// Shared responsive pagination. Only a small window of pages is rendered,
// preventing large result sets from expanding the mobile viewport.
export default function Pagination({
  page, pageSize, totalItems, onPageChange,
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize)));
  const current = Math.min(Math.max(page, 0), pageCount - 1);
  const start = totalItems === 0 ? 0 : current * pageSize + 1;
  const end = Math.min(totalItems, (current + 1) * pageSize);
  const pages = new Set<number>([0, pageCount - 1]);
  for (let i = current - 1; i <= current + 1; i++) {
    if (i >= 0 && i < pageCount) pages.add(i);
  }
  const visible = [...pages].sort((a, b) => a - b);
  const control = "inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink";
  return (
    <nav aria-label="Table pagination" className="flex w-full min-w-0 flex-col gap-3 rounded-2xl border border-pink-100 bg-white px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:rounded-full sm:px-5">
      <span className="text-center text-xs text-zinc-600 sm:text-left sm:text-sm">
        Showing {start}–{end} of {totalItems} items
      </span>
      <div className="flex min-w-0 flex-wrap items-center justify-center gap-1 sm:gap-1.5">
        <button type="button" onClick={() => onPageChange(Math.max(0, current - 1))} disabled={current === 0}
          className={`${control} text-brand-pink disabled:cursor-not-allowed disabled:text-zinc-300`} aria-label="Previous page">‹</button>
        {visible.map((index, position) => (
          <span className="contents" key={index}>
            {position > 0 && index - visible[position - 1] > 1 && (
              <span className="px-0.5 text-zinc-400" aria-hidden="true">…</span>
            )}
            <button type="button" aria-label={`Page ${index + 1}`} aria-current={current === index ? "page" : undefined}
              onClick={() => onPageChange(index)}
              className={`${control} border ${current === index ? "border-brand-pink bg-brand-tint text-brand-pink" : "border-transparent text-zinc-600 hover:bg-brand-tint"}`}>
              {index + 1}
            </button>
          </span>
        ))}
        <button type="button" onClick={() => onPageChange(Math.min(pageCount - 1, current + 1))} disabled={current === pageCount - 1}
          className={`${control} text-brand-pink disabled:cursor-not-allowed disabled:text-zinc-300`} aria-label="Next page">›</button>
      </div>
    </nav>
  );
}
