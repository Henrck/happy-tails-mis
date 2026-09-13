"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { fetchGroomers, fetchKennels } from "@/lib/supabase/pet-services";
import { fetchGroomingSessions, fetchBoardingSessions } from "@/lib/supabase/service-sessions";

function PawIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="9" cy="9" r="4" />
      <circle cx="23" cy="9" r="4" />
      <circle cx="6" cy="18" r="3.5" />
      <circle cx="26" cy="18" r="3.5" />
      <path d="M16 13c-5 0-8 4-8 8 0 4 3 6 8 6s8-2 8-6c0-4-3-8-8-8Z" />
    </svg>
  );
}

function GroomingIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="w-9 h-9" aria-hidden="true">
      <path d="M16 22 29 9l13 13" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 20v27h22V20" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M29 30h6M27 36h10M24 43h16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M45 15c3 2 4 5 4 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M49 11c3 2 5 5 5 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function BoardingIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="w-9 h-9" aria-hidden="true">
      <path d="M10 28 32 10l22 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 25v29h34V25" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M25 54V39h14v15" stroke="currentColor" strokeWidth="3" />
      <path d="M32 29c-4 0-7 3-7 7h14c0-4-3-7-7-7Z" stroke="currentColor" strokeWidth="3" />
      <circle cx="28" cy="27" r="2" fill="currentColor" />
      <circle cx="36" cy="27" r="2" fill="currentColor" />
    </svg>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "pink" | "blue" | "green";
}) {
  const toneClass =
    tone === "pink"
      ? "bg-pink-50 text-brand-pink"
      : tone === "blue"
        ? "bg-blue-50 text-blue-500"
        : "bg-emerald-50 text-emerald-600";

  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${toneClass}`}>
        <PawIcon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-zinc-400 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

export default function PetServicesPage() {
  const [activeGroomers, setActiveGroomers] = useState(0);
  const [ongoingGroomingSessions, setOngoingGroomingSessions] = useState(0);
  const [kennels, setKennels] = useState(0);
  const [occupiedKennels, setOccupiedKennels] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    const [groomerResult, kennelResult, groomingResult, boardingResult] =
      await Promise.all([
        fetchGroomers(),
        fetchKennels(),
        fetchGroomingSessions(),
        fetchBoardingSessions(),
      ]);

    if (!groomerResult.error) {
      setActiveGroomers(
        groomerResult.groomers.filter((g) => g.status === "active").length
      );
    }

    if (!kennelResult.error) {
      setKennels(kennelResult.kennels.length);
    }

    if (!groomingResult.error) {
      setOngoingGroomingSessions(groomingResult.sessions.length);
    }

    if (!boardingResult.error) {
      setOccupiedKennels(boardingResult.sessions.length);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadStats();

    const interval = window.setInterval(loadStats, 30000);
    return () => window.clearInterval(interval);
  }, [loadStats]);

  return (
    <div className="min-h-full">
      {/* Page heading */}
      <div className="flex items-start gap-3">
        <div className="mt-1 w-11 h-11 rounded-2xl bg-pink-100 text-brand-pink flex items-center justify-center shrink-0">
          <PawIcon className="w-7 h-7" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 leading-tight">
            Pet Services
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage grooming and boarding operations in one place.
          </p>
        </div>
      </div>

      <div className="mt-5 border-b border-pink-200" />

      {/* Service cards */}
      <div className="mt-7 grid grid-cols-1 xl:grid-cols-2 gap-5">
        <section className="rounded-3xl border border-pink-100 bg-white shadow-sm overflow-hidden">
          <div className="h-2 bg-brand-pink" />

          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="w-14 h-14 rounded-2xl bg-pink-50 text-brand-pink flex items-center justify-center">
                <GroomingIcon />
              </div>

              <span className="text-xs font-semibold text-brand-pink bg-pink-50 px-3 py-1.5 rounded-full">
                Grooming
              </span>
            </div>

            <h2 className="mt-5 text-2xl font-bold text-slate-800">
              Pet Grooming
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500 max-w-md">
              Monitor active grooming sessions and manage the groomers
              handling each pet.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-pink-50/70 border border-pink-100 p-4">
              <Stat
                label="Ongoing sessions"
                value={ongoingGroomingSessions}
                tone="pink"
              />
              <Stat label="Available groomers" value={Math.max(0, activeGroomers - ongoingGroomingSessions)} tone="pink" />
            </div>

            <Link
              href="/admin/pet-services/grooming"
              className="mt-5 inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-full bg-brand-pink text-white font-semibold text-sm hover:bg-brand-pink-dark transition-colors shadow-sm"
            >
              View Grooming
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-blue-100 bg-white shadow-sm overflow-hidden">
          <div className="h-2 bg-blue-500" />

          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
                <BoardingIcon />
              </div>

              <span className="text-xs font-semibold text-blue-500 bg-blue-50 px-3 py-1.5 rounded-full">
                Boarding
              </span>
            </div>

            <h2 className="mt-5 text-2xl font-bold text-slate-800">
              Pet Boarding
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500 max-w-md">
              Monitor kennel capacity and manage boarding spaces for pets
              currently staying at Happy Tails.
            </p>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3 rounded-2xl bg-blue-50/70 border border-blue-100 p-4">
              <Stat label="Total kennels" value={kennels} tone="blue" />
              <Stat label="Occupied" value={occupiedKennels} tone="blue" />
              <Stat
                label="Available"
                value={Math.max(0, kennels - occupiedKennels)}
                tone="green"
              />
            </div>

            <Link
              href="/admin/pet-services/boarding"
              className="mt-5 inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-full bg-blue-500 text-white font-semibold text-sm hover:bg-blue-600 transition-colors shadow-sm"
            >
              View Boarding
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </div>

      {/* Small operational summary */}
      <div className="mt-5 rounded-2xl border border-zinc-200 bg-white px-5 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-800">Service overview</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {loading ? "Updating service information…" : "Information refreshes automatically."}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Connected
          </div>
        </div>
      </div>
    </div>
  );
}
