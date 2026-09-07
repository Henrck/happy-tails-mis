// Superadmin dashboard v2.
import DashboardHeader from "@/components/admin/DashboardHeader";
import KpiCard from "@/components/admin/KpiCard";
import TodaysServicesCard from "@/components/admin/TodaysServicesCard";
import LowStockAlerts from "@/components/admin/LowStockAlerts";
import DashboardCalendar from "@/components/admin/DashboardCalendar";
import RecentActivityTimeline from "@/components/admin/RecentActivityTimeline";
import TodaysSchedule from "@/components/admin/TodaysSchedule";
import BookingsChart from "@/components/admin/BookingsChart";
import {
  todaysAppointmentCount, monthlyRevenue, monthlyRevenueChangePercent, pendingAppointmentsCount,
} from "@/lib/data/admin-mock";

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <DashboardHeader />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          value={String(todaysAppointmentCount)}
          label="Today's Appointment"
          href="/admin/appointments"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" /></svg>}
        />
        <KpiCard
          value={`₱${monthlyRevenue.toLocaleString()}`}
          label="This Month Revenue"
          badge={{ text: `${monthlyRevenueChangePercent}%`, positive: true }}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2v20M17 6H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H6" strokeLinecap="round" /></svg>}
        />
        <KpiCard
          value={String(pendingAppointmentsCount)}
          label="Pending Appointments"
          href="/admin/appointments"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-1 flex flex-col gap-4">
          <TodaysServicesCard />
          <LowStockAlerts />
        </div>
        <div className="lg:col-span-2">
          <DashboardCalendar />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <RecentActivityTimeline />
        <TodaysSchedule />
      </div>

      <BookingsChart />
    </div>
  );
}
