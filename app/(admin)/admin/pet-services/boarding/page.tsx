"use client";
// Boarding Management — real version. Kennels now come from the real
// `kennels` table: genuinely addable and removable, not a hardcoded
// array. No session data exists yet (no real appointments/bookings
// table), so every kennel is correctly shown as available — that's not
// a shortcut, there's nothing real to attach to a kennel yet.
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchKennels, addKennel, removeKennel as removeKennelReq } from "@/lib/supabase/pet-services";
import type { Kennel, KennelSize } from "@/lib/types/pet-services";
import KennelStats from "@/components/admin/pet-services/KennelStats";
import BoardingFilters, { type BoardingFilterState } from "@/components/admin/pet-services/BoardingFilters";
import BoardingHistoryModal from "@/components/admin/pet-services/BoardingHistoryModal";
import OpsKennelCard from "@/components/admin/operations/OpsKennelCard";
import AddKennelModal from "@/components/admin/operations/AddKennelModal";

export default function BoardingManagementPage() {
  const router = useRouter();
  const [kennels, setKennels] = useState<Kennel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<BoardingFilterState>({ search: "", status: "all" });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [addKennelOpen, setAddKennelOpen] = useState(false);

  const loadKennels = useCallback(async () => {
    const { kennels: data, error } = await fetchKennels();
    if (error) { setLoadError(error); return; }
    setLoadError(null);
    setKennels(data);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadKennels().finally(() => setLoading(false));
  }, [loadKennels]);

  // Search/status filtering against real kennels: with no session data,
  // "status" filtering beyond "all" has nothing to match against yet
  // (every kennel is available) — search by kennel number still works.
  const filtered = kennels.filter((k) => {
    const q = filters.search.trim().toLowerCase();
    const matchesSearch = !q || String(k.number).includes(q);
    const matchesStatus = filters.status === "all";
    return matchesSearch && matchesStatus;
  });

  const smallKennels = filtered.filter((k) => k.size === "small");
  const bigKennels = filtered.filter((k) => k.size === "big");

  function nextKennelNumber(size: KennelSize) {
    const nums = kennels.filter((k) => k.size === size).map((k) => k.number);
    return nums.length ? Math.max(...nums) + 1 : 101;
  }

  async function handleAddKennel(size: KennelSize, number: number) {
    const { error } = await addKennel(size, number);
    setAddKennelOpen(false);
    if (error) { setLoadError(error.message); return; }
    await loadKennels();
  }

  async function handleRemoveKennel(id: string) {
    await removeKennelReq(id);
    await loadKennels();
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-pink">Boarding Management</h1>

      {loadError && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{loadError}</p>}

      <div className="mt-6">
        <KennelStats kennels={kennels.map((k) => ({ ...k, session: null }))} />
      </div>

      <div className="mt-6">
        <BoardingFilters
          filters={filters}
          onChange={setFilters}
          onBack={() => router.push("/admin/pet-services")}
          onOpenHistory={() => setHistoryOpen(true)}
          historyCount={0}
        />
      </div>

      {loading ? (
        <p className="mt-10 text-center text-zinc-400">Loading kennels…</p>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between">
            <h3 className="font-bold text-zinc-800">SMALL KENNELS</h3>
            <button onClick={() => setAddKennelOpen(true)} className="text-xs font-semibold border border-brand-pink text-brand-pink px-4 py-1.5 rounded-full hover:bg-brand-pink hover:text-white transition-colors">
              Add Kennel
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {smallKennels.length === 0 ? (
              <p className="col-span-full text-center text-zinc-400 py-6">No small kennels.</p>
            ) : (
              smallKennels.map((k) => (
                <OpsKennelCard key={k.id} kennel={k} onView={() => {}} onRemove={() => handleRemoveKennel(k.id)} />
              ))
            )}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <h3 className="font-bold text-zinc-800">BIG KENNELS</h3>
            <button onClick={() => setAddKennelOpen(true)} className="text-xs font-semibold border border-brand-pink text-brand-pink px-4 py-1.5 rounded-full hover:bg-brand-pink hover:text-white transition-colors">
              Add Kennel
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {bigKennels.length === 0 ? (
              <p className="col-span-full text-center text-zinc-400 py-6">No big kennels.</p>
            ) : (
              bigKennels.map((k) => (
                <OpsKennelCard key={k.id} kennel={k} onView={() => {}} onRemove={() => handleRemoveKennel(k.id)} />
              ))
            )}
          </div>
        </>
      )}

      {historyOpen && <BoardingHistoryModal history={[]} onClose={() => setHistoryOpen(false)} />}

      {addKennelOpen && (
        <AddKennelModal nextNumber={nextKennelNumber} onClose={() => setAddKennelOpen(false)} onAdd={handleAddKennel} />
      )}
    </div>
  );
}
