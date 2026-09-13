"use client";

export default function DashboardHeader() {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Welcome back, Admin!
        </p>
      </div>
    </div>
  );
}
