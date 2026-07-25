"use client";
// Grooming Management: same live session view as Pet Services > Grooming,
// with Add Staff added on top. Reuses the existing stats/filters/groomer-
// grouping/detail modal/history components.
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { groomingSessions as initialSessions, type GroomingSession, type SessionStage } from "@/lib/data/grooming-sessions-mock";
import { staff as initialStaff } from "@/lib/data/staff-mock";
import SessionStats from "@/components/admin/pet-services/SessionStats";
import SessionFilters, { type SessionFilterState } from "@/components/admin/pet-services/SessionFilters";
import GroomerGroup from "@/components/admin/pet-services/GroomerGroup";
import SessionDetailModal from "@/components/admin/pet-services/SessionDetailModal";
import HistoryModal from "@/components/admin/pet-services/HistoryModal";
import AddStaffModal from "@/components/admin/operations/AddStaffModal";

export default function GroomingManagementOpsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [staffList, setStaffList] = useState(initialStaff);
  const [filters, setFilters] = useState<SessionFilterState>({ search: "", status: "all", groomer: "all" });
  const [selected, setSelected] = useState<GroomingSession | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);

  const groomerNames = useMemo(() => Array.from(new Set(sessions.map((s) => s.groomerName))), [sessions]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return sessions.filter((s) => {
      const matches = !q || s.petName.toLowerCase().includes(q) || s.ownerName.toLowerCase().includes(q) || s.groomerName.toLowerCase().includes(q);
      const matchesStatus = filters.status === "all" || s.stage === filters.status;
      const matchesGroomer = filters.groomer === "all" || s.groomerName === filters.groomer;
      return matches && matchesStatus && matchesGroomer;
    });
  }, [sessions, filters]);

  const active = filtered.filter((s) => s.stage === "scheduled" || s.stage === "in_progress");
  const completedSessions = sessions.filter((s) => s.stage === "completed");
  const activeByGroomer = active.reduce<Record<string, GroomingSession[]>>((acc, s) => {
    (acc[s.groomerName] ??= []).push(s);
    return acc;
  }, {});

  function updateStage(id: string, stage: SessionStage, startedAt?: string) {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, stage, sessionStartedAt: startedAt ?? s.sessionStartedAt } : s)));
    setSelected((prev) => (prev && prev.id === id ? { ...prev, stage, sessionStartedAt: startedAt ?? prev.sessionStartedAt } : prev));
  }

  function addStaff(name: string) {
    setStaffList((prev) => [...prev, { id: `st-${Date.now()}`, name, archived: false }]);
  }
  function toggleStaffArchive(id: string) {
    setStaffList((prev) => prev.map((s) => (s.id === id ? { ...s, archived: !s.archived } : s)));
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-pink">Grooming Management</h1>

      <div className="mt-6"><SessionStats sessions={sessions} /></div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <SessionFilters
          filters={filters}
          onChange={setFilters}
          groomerNames={groomerNames}
          onBack={() => router.push("/admin/operations")}
          onOpenHistory={() => setHistoryOpen(true)}
          historyCount={completedSessions.length}
        />
        <button onClick={() => setStaffModalOpen(true)} className="border-2 border-brand-pink text-brand-pink font-semibold text-sm px-5 py-2 rounded-full hover:bg-brand-pink hover:text-white transition-colors whitespace-nowrap">
          Add Staff
        </button>
      </div>

      {Object.keys(activeByGroomer).length === 0 ? (
        <p className="mt-10 text-center text-zinc-400">No active sessions match your search/filter.</p>
      ) : (
        Object.entries(activeByGroomer).map(([groomer, groomerSessions]) => (
          <GroomerGroup key={groomer} groomerName={groomer} sessions={groomerSessions} onView={setSelected} />
        ))
      )}

      {selected && <SessionDetailModal session={selected} onClose={() => setSelected(null)} onUpdateStage={updateStage} />}
      {historyOpen && <HistoryModal completedSessions={completedSessions} onClose={() => setHistoryOpen(false)} />}
      {staffModalOpen && (
        <AddStaffModal staffList={staffList} onClose={() => setStaffModalOpen(false)} onAdd={addStaff} onArchiveToggle={toggleStaffArchive} />
      )}
    </div>
  );
}
