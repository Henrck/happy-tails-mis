import { todaysServices } from "@/lib/data/admin-mock";

export default function TodaysServicesCard() {
  const services = [
    {
      key: "grooming", label: "Grooming", appointments: todaysServices.grooming.appointments, walkIns: todaysServices.grooming.walkIns,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 21c-3 0-6-1.5-6-4.5S9 13 12 13s6 .5 6 3.5S15 21 12 21z" /></svg>
      ),
    },
    {
      key: "boarding", label: "Boarding", appointments: todaysServices.boarding.appointments, walkIns: todaysServices.boarding.walkIns,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10l9-7 9 7" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" strokeLinecap="round" strokeLinejoin="round" /></svg>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-3">
      <h3 className="font-bold text-brand-pink text-xs">Today&apos;s Services</h3>
      {/* Stacked vertically (Grooming, then Boarding) instead of side by
          side — each row now has room to breathe and use the card's full
          width, instead of being squeezed into half-width columns. */}
      <div className="mt-2 flex flex-col divide-y divide-pink-50">
        {services.map((s) => (
          <div key={s.key} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
            <div className="w-9 h-9 rounded-lg bg-brand-tint flex items-center justify-center text-brand-pink shrink-0">{s.icon}</div>
            <p className="text-sm font-semibold text-zinc-800 w-[70px] shrink-0">{s.label}</p>
            <div className="flex-1 flex items-center justify-end gap-4 text-right">
              <div>
                <p className="text-sm font-bold text-zinc-800">{s.appointments}</p>
                <p className="text-[10px] text-zinc-500">Appointments</p>
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-800">{s.walkIns}</p>
                <p className="text-[10px] text-zinc-500">Walk-ins</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
