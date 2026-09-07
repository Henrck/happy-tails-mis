"use client";
import { useEffect, useState } from "react";

export default function ReportsHeader() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900" style={{ fontFamily: "var(--font-body)" }}>
          Report Management
        </h1>
        <p className="mt-1 text-sm text-zinc-500">View and manage all reports in one place.</p>
      </div>

      <div className="flex items-center gap-4">
        <button
          aria-label="Notifications"
          className="w-9 h-9 rounded-full bg-white border border-[#E8E8E8] flex items-center justify-center text-zinc-500 hover:border-[#FF5F9E] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" />
          </svg>
        </button>

        {now && (
          <div className="text-right">
            <p className="text-sm font-medium text-zinc-700">
              {now.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </p>
            <p className="text-xs text-zinc-400">
              {now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
