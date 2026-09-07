"use client";
// Grooming Management — real version. Groomers now come from the real
// `groomers` table (not staff-mock.ts, and deliberately not
// staff_profiles either — groomers are names tied to the grooming
// service, not login accounts).
//
// Sessions stay genuinely empty: there's no real appointments/bookings
// table yet, so there's nothing true to show. The old GroomerGroup
// component only ever rendered per-groomer when that groomer already had
// sessions — with zero sessions that meant the whole roster vanished.
// GroomerRoster replaces it: it shows every real groomer regardless of
// session count, which is what "it's okay to display groomers, no
// sessions yet" actually means.
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchGroomers, addGroomer, setGroomerStatus } from "@/lib/supabase/pet-services";
import type { Groomer } from "@/lib/types/pet-services";
import SessionStats from "@/components/admin/pet-services/SessionStats";
import SessionFilters, { type SessionFilterState } from "@/components/admin/pet-services/SessionFilters";
import GroomerRoster from "@/components/admin/pet-services/GroomerRoster";
import HistoryModal from "@/components/admin/pet-services/HistoryModal";
import AddGroomerModal from "@/components/admin/pet-services/AddGroomerModal";

export default function GroomingManagementPage() {
  const router = useRouter();
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SessionFilterState>({ search: "", status: "all", groomer: "all" });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [groomerModalOpen, setGroomerModalOpen] = useState(false);

  const loadGroomers = useCallback(async () => {
    const { groomers: data, error } = await fetchGroomers();
    if (error) { setLoadError(error); return; }
    setLoadError(null);
    setGroomers(data);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadGroomers().finally(() => setLoading(false));
  }, [loadGroomers]);

  const activeGroomers = groomers.filter((g) => g.status === "active");
  const groomerNames = activeGroomers.map((g) => g.name);

  async function handleAddGroomer(name: string): Promise<string | null> {
    const { error } = await addGroomer(name);
    if (error) return error.message;
    await loadGroomers();
    return null;
  }

  async function handleToggleGroomerArchive(id: string, currentStatus: "active" | "archived") {
    await setGroomerStatus(id, currentStatus === "active" ? "archived" : "active");
    await loadGroomers();
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-pink">Grooming Management</h1>

      {loadError && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{loadError}</p>}

      {/* Sessions genuinely don't exist yet — every count here is real,
          just real zeros, not a placeholder. */}
      <div className="mt-6">
        <SessionStats sessions={[]} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <SessionFilters
          filters={filters}
          onChange={setFilters}
          groomerNames={groomerNames}
          onBack={() => router.push("/admin/pet-services")}
          onOpenHistory={() => setHistoryOpen(true)}
          historyCount={0}
        />
        <button onClick={() => setGroomerModalOpen(true)} className="border-2 border-brand-pink text-brand-pink font-semibold text-sm px-5 py-2 rounded-full hover:bg-brand-pink hover:text-white transition-colors whitespace-nowrap">
          Add Groomer
        </button>
      </div>

      {loading ? (
        <p className="mt-10 text-center text-zinc-400">Loading groomers…</p>
      ) : (
        <GroomerRoster groomers={activeGroomers} onArchiveToggle={(id) => handleToggleGroomerArchive(id, "active")} />
      )}

      {historyOpen && <HistoryModal completedSessions={[]} onClose={() => setHistoryOpen(false)} />}

      {groomerModalOpen && (
        <AddGroomerModal
          groomers={groomers}
          onClose={() => setGroomerModalOpen(false)}
          onAdd={handleAddGroomer}
          onArchiveToggle={handleToggleGroomerArchive}
        />
      )}
    </div>
  );
}
