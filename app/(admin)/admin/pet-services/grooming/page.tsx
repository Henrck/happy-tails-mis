"use client";
// Grooming Management: stats, search/filter/history, groomer-grouped
// session cards, detail modal with the full Scheduled -> In Progress ->
// Completed lifecycle including the payment confirmation step.
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { groomingSessions as initialSessions, type GroomingSession, type SessionStage } from "@/lib/data/grooming-sessions-mock";
import SessionStats from "@/components/admin/pet-services/SessionStats";
import SessionFilters, { type SessionFilterState } from "@/components/admin/pet-services/SessionFilters";
import GroomerGroup from "@/components/admin/pet-services/GroomerGroup";
import SessionDetailModal from "@/components/admin/pet-services/SessionDetailModal";
import HistoryModal from "@/components/admin/pet-services/HistoryModal";

export default function GroomingManagementPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [filters, setFilters] = useState<SessionFilterState>({ search: "", status: "all", groomer: "all" });
  const [selected, setSelected] = useState<GroomingSession | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const groomerNames = useMemo(
    () => Array.from(new Set(sessions.map((s) => s.groomerName))),
    [sessions]
  );

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return sessions.filter((s) => {
      const matchesSearch =
        !search ||
        s.petName.toLowerCase().includes(search) ||
        s.ownerName.toLowerCase().includes(search) ||
        s.groomerName.toLowerCase().includes(search);
      const matchesStatus = filters.status === "all" || s.stage === filters.status;
      const matchesGroomer = filters.groomer === "all" || s.groomerName === filters.groomer;
      return matchesSearch && matchesStatus && matchesGroomer;
    });
  }, [sessions, filters]);

  // Active = scheduled or in_progress. Completed sessions move to History
  // instead of cluttering the groomer cards, matching the reference.
  const active = filtered.filter((s) => s.stage === "scheduled" || s.stage === "in_progress");
  const completedSessions = sessions.filter((s) => s.stage === "completed");

  const activeByGroomer = active.reduce<Record<string, GroomingSession[]>>((acc, s) => {
    (acc[s.groomerName] ??= []).push(s);
    return acc;
  }, {});

  function updateStage(id: string, stage: SessionStage, startedAt?: string) {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, stage, sessionStartedAt: startedAt ?? s.sessionStartedAt } : s))
    );
    setSelected((prev) =>
      prev && prev.id === id ? { ...prev, stage, sessionStartedAt: startedAt ?? prev.sessionStartedAt } : prev
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-pink">Grooming Management</h1>

      <div className="mt-6">
        <SessionStats sessions={sessions} />
      </div>

      <div className="mt-6">
        <SessionFilters
          filters={filters}
          onChange={setFilters}
          groomerNames={groomerNames}
          onBack={() => router.push("/admin/pet-services")}
          onOpenHistory={() => setHistoryOpen(true)}
          historyCount={completedSessions.length}
        />
      </div>

      {Object.keys(activeByGroomer).length === 0 ? (
        <p className="mt-10 text-center text-zinc-400">No active sessions match your search/filter.</p>
      ) : (
        Object.entries(activeByGroomer).map(([groomer, groomerSessions]) => (
          <GroomerGroup key={groomer} groomerName={groomer} sessions={groomerSessions} onView={setSelected} />
        ))
      )}

      {selected && (
        <SessionDetailModal session={selected} onClose={() => setSelected(null)} onUpdateStage={updateStage} />
      )}

      {historyOpen && (
        <HistoryModal completedSessions={completedSessions} onClose={() => setHistoryOpen(false)} />
      )}
    </div>
  );
}
