// Superadmin dashboard home. All data is mock for now (see
// lib/data/admin-mock.ts) — the "Staff Active" stat card from the design
// was deliberately dropped per Josh's call, since this business runs a
// single POS and it wasn't clearly useful.
import StatCard from "@/components/admin/StatCard";
import StaffOnDuty from "@/components/admin/StaffOnDuty";
import ServiceShortcuts from "@/components/admin/ServiceShortcuts";
import RecentActivity from "@/components/admin/RecentActivity";
import LowStock from "@/components/admin/LowStock";
import BookingChart from "@/components/admin/BookingChart";
import AppointmentCalendar from "@/components/admin/AppointmentCalendar";
import { todaysAppointmentCount, monthlyRevenue } from "@/lib/data/admin-mock";

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-pink">Dashboard</h1>

      {/* Top stat row */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          value={`₱${monthlyRevenue.toLocaleString()}`}
          label="Monthly Revenue"
          icon={
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#F53D93" strokeWidth="1.8">
              <path d="M12 2v20M17 6H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H6" strokeLinecap="round" />
            </svg>
          }
        />
      </div>

      {/* Main grid: left = staff/activity, right = shortcuts/chart/calendar */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <StaffOnDuty />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <RecentActivity />
            <LowStock />
          </div>
        </div>

        <div className="space-y-6">
          <ServiceShortcuts />
          <BookingChart />
          <AppointmentCalendar />
        </div>
      </div>
    </div>
  );
}
