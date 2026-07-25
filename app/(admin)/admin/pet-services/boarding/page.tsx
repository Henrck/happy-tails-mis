"use client";
// Boarding Management: kennel-based (not staff-based) session tracking.
// Booked -> Checked In -> Checked Out, with a payment step (method +
// amount paid + live change calculation) before completion. Completed
// sessions free up their kennel and move into History.
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  kennels as initialKennels,
  boardingHistory as initialHistory,
  type Kennel,
  type BoardingStage,
} from "@/lib/data/boarding-kennels-mock";
import KennelStats from "@/components/admin/pet-services/KennelStats";
import BoardingFilters, { type BoardingFilterState } from "@/components/admin/pet-services/BoardingFilters";
import KennelGroup from "@/components/admin/pet-services/KennelGroup";
import BoardingDetailModal from "@/components/admin/pet-services/BoardingDetailModal";
import BoardingHistoryModal from "@/components/admin/pet-services/BoardingHistoryModal";

export default function BoardingManagementPage() {
  const router = useRouter();
  const [kennels, setKennels] = useState(initialKennels);
  const [history, setHistory] = useState(initialHistory);
  const [filters, setFilters] = useState<BoardingFilterState>({ search: "", status: "all" });
  const [selectedKennelId, setSelectedKennelId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const selectedKennel = kennels.find((k) => k.id === selectedKennelId) ?? null;

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return kennels.filter((k) => {
      if (!k.session) return filters.status === "all" && !search;
      const matchesSearch =
        !search ||
        k.session.petName.toLowerCase().includes(search) ||
        k.session.ownerName.toLowerCase().includes(search) ||
        String(k.number).includes(search);
      const matchesStatus = filters.status === "all" || k.session.stage === filters.status;
      return matchesSearch && matchesStatus;
    });
  }, [kennels, filters]);

  const smallKennels = filtered.filter((k) => k.size === "small");
  const bigKennels = filtered.filter((k) => k.size === "big");

  function updateStage(id: string, stage: BoardingStage, paymentMethod?: string, amountPaid?: number) {
    setKennels((prev) =>
      prev.map((k) => {
        if (k.id !== id || !k.session) return k;

        if (stage === "checked_out") {
          // Move the completed, paid session into History and free the kennel.
          const completedSession = { ...k.session, stage, paymentMethod, amountPaid };
          setHistory((h) => [...h, completedSession]);
          return { ...k, session: null };
        }

        if (stage === "cancelled") {
          // Cancelling also frees the kennel — no history entry, since
          // nothing was actually paid or completed.
          return { ...k, session: null };
        }

        return { ...k, session: { ...k.session, stage } };
      })
    );
    setSelectedKennelId(null);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-pink">Boarding Management</h1>

      <div className="mt-6">
        <KennelStats kennels={kennels} />
      </div>

      <div className="mt-6">
        <BoardingFilters
          filters={filters}
          onChange={setFilters}
          onBack={() => router.push("/admin/pet-services")}
          onOpenHistory={() => setHistoryOpen(true)}
          historyCount={history.length}
        />
      </div>

      <KennelGroup title="SMALL KENNELS" kennels={smallKennels} onView={(k) => setSelectedKennelId(k.id)} />
      <KennelGroup title="BIG KENNELS" kennels={bigKennels} onView={(k) => setSelectedKennelId(k.id)} />

      {selectedKennel?.session && (
        <BoardingDetailModal
          session={selectedKennel.session}
          onClose={() => setSelectedKennelId(null)}
          onUpdateStage={updateStage}
        />
      )}

      {historyOpen && (
        <BoardingHistoryModal history={history} onClose={() => setHistoryOpen(false)} />
      )}
    </div>
  );
}
