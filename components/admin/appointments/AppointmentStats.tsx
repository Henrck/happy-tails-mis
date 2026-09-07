"use client";
import { useState, useEffect } from "react";
import StatCard from "@/components/admin/StatCard";
import { fetchTodaysAppointmentCount, fetchTodaysTransactionTotal } from "@/lib/supabase/appointment-management";
import { fetchAllPets } from "@/lib/supabase/appointments";

// Refetches on every `refreshKey` change — the parent bumps this key
// whenever the realtime subscription fires, so these numbers stay live
// too, not just the table.
export default function AppointmentStats({ refreshKey }: { refreshKey: number }) {
  const [todaysCount, setTodaysCount] = useState(0);
  const [totalPets, setTotalPets] = useState(0);
  const [todaysTotal, setTodaysTotal] = useState(0);

  useEffect(() => {
    fetchTodaysAppointmentCount().then((r) => setTodaysCount(r.count));
    fetchAllPets().then((r) => setTotalPets(r.pets.length));
    fetchTodaysTransactionTotal().then((r) => setTodaysTotal(r.total));
  }, [refreshKey]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        value={String(todaysCount)}
        label="Today's Appointment"
        icon={
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#F53D93" strokeWidth="1.8">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" />
          </svg>
        }
      />
      <StatCard
        value={String(totalPets)}
        label="Total Pets Registered"
        icon={
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#84cc16" strokeWidth="1.8">
            <path d="M8 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 21c-3 0-6-1.5-6-4.5S9 13 12 13s6 .5 6 3.5S15 21 12 21z" />
          </svg>
        }
      />
      <StatCard
        value={`₱${todaysTotal.toLocaleString()}`}
        label="Total Transaction Today"
        icon={
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.8">
            <path d="M12 2v20M17 6H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H6" strokeLinecap="round" />
          </svg>
        }
      />
    </div>
  );
}
