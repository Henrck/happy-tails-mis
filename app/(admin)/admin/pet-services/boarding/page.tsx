"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  fetchKennels,
  addKennel,
  removeKennel as removeKennelReq,
} from "@/lib/supabase/pet-services";
import {
  fetchBoardingSessions,
  subscribeToServiceSessions,
  type BoardingSessionRow,
} from "@/lib/supabase/service-sessions";
import type { Kennel, KennelSize } from "@/lib/types/pet-services";
import { completeAppointmentPet } from "@/lib/supabase/appointment-management";
import KennelStats from "@/components/admin/pet-services/KennelStats";
import BoardingFilters, {
  type BoardingFilterState,
} from "@/components/admin/pet-services/BoardingFilters";
import BoardingHistoryModal from "@/components/admin/pet-services/BoardingHistoryModal";
import OpsKennelCard from "@/components/admin/operations/OpsKennelCard";
import AddKennelModal from "@/components/admin/operations/AddKennelModal";
import SessionDetailsModal from "@/components/admin/pet-services/SessionDetailsModal";
import SessionCompletedModal from "@/components/admin/pet-services/SessionCompletedModal";

export default function BoardingManagementPage() {
  const router = useRouter();

  const [kennels, setKennels] = useState<Kennel[]>([]);
  const [sessions, setSessions] = useState<BoardingSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<BoardingFilterState>({
    search: "",
    status: "all",
  });

  const [history, setHistory] = useState(false);
  const [add, setAdd] = useState(false);
  const [viewing, setViewing] = useState<BoardingSessionRow | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completedName, setCompletedName] = useState<string | null>(null);

  async function handleComplete(appointmentPetId: string, petName: string) {
    setCompletingId(appointmentPetId);
    const { error } = await completeAppointmentPet(appointmentPetId, "kennel");
    if (error) {
      setError(error);
    } else {
      setSessions((prev) => prev.filter((s) => s.appointmentPetId !== appointmentPetId));
      setCompletedName(petName);
    }
    setCompletingId(null);
  }

  const load = useCallback(async () => {
    const [k, s] = await Promise.all([
      fetchKennels(),
      fetchBoardingSessions(),
    ]);

    if (k.error || s.error) {
      setError(
        k.error ??
          s.error ??
          "Unable to load boarding data."
      );
      return;
    }

    setError(null);
    setKennels(k.kennels);
    setSessions(s.sessions);
  }, []);

  useEffect(() => {
    setLoading(true);

    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    return subscribeToServiceSessions(load);
  }, [load]);

  /*
   * FIX:
   * BoardingStage only contains:
   * "booked" | "checked_in" | "checked_out" | "cancelled"
   *
   * The previous code incorrectly compared the status
   * against "available" and "in_progress".
   *
   * Availability is represented by the absence of a session,
   * while an existing session has its own BoardingStage.
   */
  const filtered = kennels.filter((k) => {
    const s = sessions.find((x) => x.kennelId === k.id);
    const q = filters.search.trim().toLowerCase();

    const matchesSearch =
      !q ||
      String(k.number).includes(q) ||
      s?.petName.toLowerCase().includes(q);

    const matchesStatus =
      filters.status === "all" ||
      (s ? s.stage === filters.status : false);

    return matchesSearch && matchesStatus;
  });

  const next = (size: KennelSize) => {
    const n = kennels
      .filter((k) => k.size === size)
      .map((k) => k.number);

    return n.length ? Math.max(...n) + 1 : 101;
  };

  async function addK(size: KennelSize, num: number) {
    const r = await addKennel(size, num);

    setAdd(false);

    if (r.error) {
      setError(r.error.message);
    } else {
      await load();
    }
  }

  async function removeK(id: string) {
    if (sessions.some((s) => s.kennelId === id)) {
      setError("An occupied kennel cannot be removed.");
      return;
    }

    const r = await removeKennelReq(id);

    if (r.error) {
      setError(r.error.message);
    } else {
      await load();
    }
  }

  const cards = (size: KennelSize) =>
    filtered.filter((k) => k.size === size);

  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-pink">
        Boarding Management
      </h1>

      {error && (
        <p className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          {error}
        </p>
      )}

      <div className="mt-6">
        <KennelStats
          kennels={kennels.map((k) => ({
            ...k,
            session: sessions.some(
              (s) => s.kennelId === k.id
            )
              ? { stage: "checked_in" as const }
              : null,
          }))}
        />
      </div>

      <div className="mt-6">
        <BoardingFilters
          filters={filters}
          onChange={setFilters}
          onBack={() =>
            router.push("/admin/pet-services")
          }
          onOpenHistory={() => setHistory(true)}
          historyCount={0}
        />
      </div>

      {loading ? (
        <p className="mt-10 text-center text-zinc-400">
          Loading…
        </p>
      ) : (
        <>
          {(["small", "big"] as KennelSize[]).map(
            (size) => (
              <section
                key={size}
                className="mt-5"
              >
                <div className="flex justify-between">
                  <h3 className="font-bold text-zinc-800">
                    {size === "small"
                      ? "SMALL"
                      : "BIG"}{" "}
                    KENNELS
                  </h3>

                  <button
                    onClick={() => setAdd(true)}
                    className="text-xs border border-brand-pink text-brand-pink px-4 py-1.5 rounded-full"
                  >
                    Add Kennel
                  </button>
                </div>

                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {cards(size).map((k) => {
                    const s = sessions.find((s) => s.kennelId === k.id) ?? null;
                    return (
                      <OpsKennelCard
                        key={k.id}
                        kennel={k}
                        session={s}
                        onView={() => setViewing(s)}
                        onRemove={() =>
                          removeK(k.id)
                        }
                        onComplete={() => {
                          if (s) handleComplete(s.appointmentPetId, s.petName);
                        }}
                        completing={s ? completingId === s.appointmentPetId : false}
                      />
                    );
                  })}

                  {cards(size).length === 0 && (
                    <p className="col-span-full text-center text-zinc-400 py-6">
                      No {size} kennels.
                    </p>
                  )}
                </div>
              </section>
            )
          )}
        </>
      )}

      {history && (
        <BoardingHistoryModal
          history={[]}
          onClose={() => setHistory(false)}
        />
      )}

      {add && (
        <AddKennelModal
          nextNumber={next}
          onClose={() => setAdd(false)}
          onAdd={addK}
        />
      )}

      {viewing && (
        <SessionDetailsModal
          appointmentId={viewing.appointmentId}
          appointmentPetId={viewing.appointmentPetId}
          onClose={() => setViewing(null)}
        />
      )}

      {completedName && (
        <SessionCompletedModal petName={completedName} onClose={() => setCompletedName(null)} />
      )}
    </div>
  );
}