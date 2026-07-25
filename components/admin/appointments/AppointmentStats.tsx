import StatCard from "@/components/admin/StatCard";
import {
  todaysAppointmentCount,
  totalPetsRegistered,
  totalTransactionToday,
} from "@/lib/data/admin-appointments-mock";

export default function AppointmentStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        value={String(todaysAppointmentCount)}
        label="Today's Appointment"
        icon={
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#F53D93" strokeWidth="1.8">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" />
          </svg>
        }
      />
      <StatCard
        value={String(totalPetsRegistered)}
        label="Total Pets Registered"
        icon={
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#84cc16" strokeWidth="1.8">
            <path d="M8 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 21c-3 0-6-1.5-6-4.5S9 13 12 13s6 .5 6 3.5S15 21 12 21z" />
          </svg>
        }
      />
      <StatCard
        value={`₱${totalTransactionToday.toLocaleString()}`}
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
