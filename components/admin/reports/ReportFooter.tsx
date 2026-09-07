"use client";
export default function ReportFooter({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : page * pageSize + 1;
  const end = Math.min(totalItems, (page + 1) * pageSize);

  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="rounded-lg border border-[#E8E8E8] bg-white px-3 py-1.5 text-sm text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#FF5F9E]/40"
      >
        {[10, 25, 50].map((n) => <option key={n} value={n}>{n} rows</option>)}
      </select>

      <p className="text-sm text-zinc-500">
        Showing {start}–{end} of {totalItems} items
      </p>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className="w-8 h-8 rounded-full border border-[#E8E8E8] flex items-center justify-center text-zinc-500 disabled:opacity-40 hover:border-[#FF5F9E] transition-colors"
        >
          ‹
        </button>
        {Array.from({ length: pageCount }, (_, i) => (
          <button
            key={i}
            onClick={() => onPageChange(i)}
            className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
              page === i ? "bg-[#FF5F9E] text-white" : "text-zinc-500 hover:bg-[#F8F9FC]"
            }`}
          >
            {i + 1}
          </button>
        ))}
        <button
          onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
          disabled={page >= pageCount - 1}
          className="w-8 h-8 rounded-full border border-[#E8E8E8] flex items-center justify-center text-zinc-500 disabled:opacity-40 hover:border-[#FF5F9E] transition-colors"
        >
          ›
        </button>
      </div>
    </div>
  );
}
