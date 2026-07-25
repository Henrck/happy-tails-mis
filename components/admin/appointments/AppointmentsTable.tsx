import type { Appointment } from "@/lib/data/admin-appointments-mock";

const statusStyles: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700",
  Confirmed: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

export default function AppointmentsTable({
  rows,
  onView,
}: {
  rows: Appointment[];
  onView: (appointment: Appointment) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-pink-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-brand-pink text-white">
            {["Appt ID", "Pet Details", "Owner", "Service", "Date & Time", "Amount", "Status", "Action"].map((h) => (
              <th key={h} className="text-left font-semibold px-4 py-3 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center text-zinc-400 py-10">
                No appointments match your search/filter.
              </td>
            </tr>
          ) : (
            rows.map((appt) => {
              const addOnsTotal = appt.addOns.reduce((sum, a) => sum + a.price, 0);
              const total = appt.servicePrice + addOnsTotal;
              return (
                <tr key={appt.id} className="border-t border-pink-50 hover:bg-brand-tint/50">
                  <td className="px-4 py-3 font-medium text-zinc-700 whitespace-nowrap">{appt.id}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-zinc-800">{appt.petName}</p>
                    <p className="text-xs text-zinc-400">{appt.species}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 whitespace-nowrap">{appt.ownerName}</td>
                  <td className="px-4 py-3 text-zinc-700 capitalize whitespace-nowrap">{appt.serviceType}</td>
                  <td className="px-4 py-3 text-zinc-700 whitespace-nowrap">
                    {appt.appointmentDate}
                    {appt.timeSlot ? ` · ${appt.timeSlot}` : ""}
                  </td>
                  <td className="px-4 py-3 font-semibold text-zinc-800 whitespace-nowrap">₱{total.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusStyles[appt.status]}`}>
                      {appt.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onView(appt)}
                      aria-label={`View ${appt.petName}'s appointment`}
                      className="text-brand-pink hover:text-brand-pink-dark border border-brand-pink rounded-full p-1.5 transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
