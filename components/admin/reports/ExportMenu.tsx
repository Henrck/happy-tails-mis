"use client";
// Was duplicated inline (and UI-only — buttons just closed the menu)
// in every one of the four report FilterToolbar variants. Pulled into
// one component wired to lib/utils/report-export.ts so all four tabs
// actually export real files instead of four copies of a dead dropdown.
import { useState, useRef, useEffect } from "react";
import { exportReportCSV, exportReportExcel, exportReportPDF, printReport, type ExportColumn } from "@/lib/utils/report-export";

export default function ExportMenu<T>({
  title,
  columns,
  rows,
  filename,
}: {
  title: string;
  columns: ExportColumn<T>[];
  rows: T[];
  filename: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleSelect(format: "PDF" | "Excel" | "CSV" | "Print") {
    setOpen(false);
    if (rows.length === 0) return;
    setBusy(true);
    try {
      const opts = { title, columns, rows, filename };
      if (format === "PDF") await exportReportPDF(opts);
      else if (format === "Excel") await exportReportExcel(opts);
      else if (format === "CSV") exportReportCSV(opts);
      else await printReport(opts);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative ml-auto" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="flex items-center gap-1.5 border border-[#E8E8E8] text-zinc-600 font-medium text-sm px-4 py-2 rounded-lg hover:bg-zinc-50 transition-colors disabled:opacity-50"
      >
        {busy ? "Exporting…" : "Export"}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && rows.length === 0 && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-lg shadow-lg border border-[#E8E8E8] px-4 py-3 z-20">
          <p className="text-xs text-zinc-400">No rows to export.</p>
        </div>
      )}
      {open && rows.length > 0 && (
        <div className="absolute right-0 top-full mt-1.5 w-36 bg-white rounded-lg shadow-lg border border-[#E8E8E8] py-1.5 z-20">
          {(["PDF", "Excel", "CSV", "Print"] as const).map((opt) => (
            <button
              type="button"
              key={opt}
              onClick={() => handleSelect(opt)}
              className="w-full text-left px-4 py-2 text-sm text-zinc-600 hover:bg-[#F8F9FC] transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
