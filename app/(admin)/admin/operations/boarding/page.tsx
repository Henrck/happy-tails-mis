"use client";
// Boarding Management: same live kennel view as Pet Services > Boarding,
// with Add/Remove Kennel added on top. Reuses the existing stats/filters/
// detail modal/history components — only the kennel cards and Add/Remove
// are new here, so the live and management views can't visually drift
// apart from each other.
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  kennels as initialKennels,
  boardingHistory as initialHistory,
  type Kennel,
  type BoardingStage,
  type KennelSize,
} from "@/lib/data/boarding-kennels-mock";
import KennelStats from "@/components/admin/pet-services/KennelStats";
import BoardingFilters, { type BoardingFilterState } from "@/components/admin/pet-services/BoardingFilters";
import BoardingDetailModal from "@/components/admin/pet-services/BoardingDetailModal";
import BoardingHistoryModal from "@/components/admin/pet-services/BoardingHistoryModal";
import OpsKennelCard from "@/components/admin/operations/OpsKennelCard";
import AddKennelModal from "@/components/admin/operations/AddKennelModal";

export default function BoardingManagementOpsPage() {
  const router = useRouter();
  const [kennels, setKennels] = useState(initialKennels);
  const [history, setHistory] = useState(initialHistory);
  const [filters, setFilters] = useState<BoardingFilterState>({ search: "", status: "all" });
  const [selectedKennelId, setSelectedKennelId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [addKennelOpen, setAddKennelOpen] = useState(false);

  const selectedKennel = kennels.find((k) => k.id === selectedKennelId) ?? null;

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return kennels.filter((k) => {
      if (!k.session) return filters.status === "all" && !q;
      const matches = !q || k.session.petName.toLowerCase().includes(q) || k.session.ownerName.toLowerCase().includes(q) || String(k.number).includes(q);
      const matchesStatus = filters.status === "all" || k.session.stage === filters.status;
      return matches && matchesStatus;
    });
  }, [kennels, filters]);

  const smallKennels = filtered.filter((k) => k.size === "small");
  const bigKennels = filtered.filter((k) => k.size === "big");

  function nextKennelNumber(size: KennelSize) {
    const nums = kennels.filter((k) => k.size === size).map((k) => k.number);
    return nums.length ? Math.max(...nums) + 1 : 101;
  }

  function addKennel(size: KennelSize, number: number) {
    setKennels((prev) => [...prev, { id: `${size}-${number}`, size, number, session: null }]);
    setAddKennelOpen(false);
  }

  function removeKennel(id: string) {
    setKennels((prev) => prev.filter((k) => k.id !== id));
  }

  function updateStage(id: string, stage: BoardingStage, paymentMethod?: string, amountPaid?: number) {
    setKennels((prev) =>
      prev.map((k) => {
        if (k.id !== id || !k.session) return k;
        if (stage === "checked_out") {
          setHistory((h) => [...h, { ...k.session!, stage, paymentMethod, amountPaid }]);
          return { ...k, session: null };
        }
        if (stage === "cancelled") return { ...k, session: null };
        return { ...k, session: { ...k.session, stage } };
      })
    );
    setSelectedKennelId(null);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-pink">Boarding Management</h1>

      <div className="mt-6"><KennelStats kennels={kennels} /></div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <BoardingFilters
          filters={filters}
          onChange={setFilters}
          onBack={() => router.push("/admin/operations")}
          onOpenHistory={() => setHistoryOpen(true)}
          historyCount={history.length}
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <h3 className="font-bold text-zinc-800">SMALL KENNELS</h3>
        <button onClick={() => setAddKennelOpen(true)} className="text-xs font-semibold border border-brand-pink text-brand-pink px-4 py-1.5 rounded-full hover:bg-brand-pink hover:text-white transition-colors">
          Add Kennel
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {smallKennels.map((k) => (
          <OpsKennelCard key={k.id} kennel={k} onView={() => setSelectedKennelId(k.id)} onRemove={() => removeKennel(k.id)} />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h3 className="font-bold text-zinc-800">BIG KENNELS</h3>
        <button onClick={() => setAddKennelOpen(true)} className="text-xs font-semibold border border-brand-pink text-brand-pink px-4 py-1.5 rounded-full hover:bg-brand-pink hover:text-white transition-colors">
          Add Kennel
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {bigKennels.map((k) => (
          <OpsKennelCard key={k.id} kennel={k} onView={() => setSelectedKennelId(k.id)} onRemove={() => removeKennel(k.id)} />
        ))}
      </div>

      {selectedKennel?.session && (
        <BoardingDetailModal session={selectedKennel.session} onClose={() => setSelectedKennelId(null)} onUpdateStage={updateStage} />
      )}
      {historyOpen && <BoardingHistoryModal history={history} onClose={() => setHistoryOpen(false)} />}
      {addKennelOpen && <AddKennelModal nextNumber={nextKennelNumber} onClose={() => setAddKennelOpen(false)} onAdd={addKennel} />}
    </div>
  );
}
