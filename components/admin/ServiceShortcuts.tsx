import Link from "next/link";
import { serviceShortcuts } from "@/lib/data/admin-mock";

export default function ServiceShortcuts() {
  return (
    <div className="space-y-4">
      {serviceShortcuts.map((service) => (
        <div key={service.id} className="bg-white rounded-2xl shadow-sm border border-pink-100 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-brand-pink">{service.label}</h3>
            <Link
              href={service.href}
              className="text-xs font-semibold border border-brand-pink text-brand-pink px-3 py-1 rounded-full hover:bg-brand-pink hover:text-white transition-colors"
            >
              View
            </Link>
          </div>
          <div className="mt-3 flex gap-8">
            <div>
              <p className="text-xs text-zinc-500">Appointments</p>
              <p className="text-xl font-bold text-zinc-900">{service.appointments}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Walk-ins</p>
              <p className="text-xl font-bold text-zinc-900">{service.walkIns}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
