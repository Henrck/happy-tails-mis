"use client";
// Reusable pagination for admin tables: "Showing X-Y of Z items" + prev/
// page-number/next controls.
export default function Pagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : page * pageSize + 1;
  const end = Math.min(totalItems, (page + 1) * pageSize);

  return (
    <div className="flex items-center justify-between bg-white rounded-full border border-pink-100 px-5 py-3">
      <span className="text-sm text-zinc-600">
        Showing {start}-{end} of {totalItems} items
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className="text-brand-pink disabled:text-zinc-300 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          ‹
        </button>
        {Array.from({ length: pageCount }, (_, i) => (
          <button
            key={i}
            onClick={() => onPageChange(i)}
            className={`w-7 h-7 rounded-full text-sm font-semibold border transition-colors ${
              page === i
                ? "border-brand-pink text-brand-pink"
                : "border-transparent text-zinc-500 hover:bg-brand-tint"
            }`}
          >
            {i + 1}
          </button>
        ))}
        <button
          onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
          disabled={page >= pageCount - 1}
          className="text-brand-pink disabled:text-zinc-300 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  );
}
