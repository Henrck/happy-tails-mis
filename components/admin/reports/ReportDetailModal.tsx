import type { ServiceReport, ReportStatus } from "@/lib/data/service-reports-mock";

const statusStyles: Record<ReportStatus, string> = {
  Completed: "bg-emerald-50 text-emerald-600",
  Ongoing: "bg-blue-50 text-blue-600",
  Scheduled: "bg-amber-50 text-amber-600",
  Cancelled: "bg-red-50 text-red-500",
};

export default function ReportDetailModal({ report, onClose }: { report: ServiceReport; onClose: () => void }) {
  const rows: [string, string][] = [
    ["Report ID", report.id],
    ["Pet", report.pet],
    ["Owner", report.owner],
    ["Service", report.service],
    ["Date", report.displayDate],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-2xl border border-[#E8E8E8] shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-900">Report Details</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-zinc-400">{label}</span>
              <span className="font-medium text-zinc-800">{value}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm pt-1">
            <span className="text-zinc-400">Status</span>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusStyles[report.status]}`}>{report.status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
