// Operation Management landing — 5 sub-modules. Matches Josh's reference:
// left accent stripe cards with an icon + label.
import Link from "next/link";

const modules = [
  { href: "/admin/operations/pos", label: "Point of Sales", icon: "📦" },
  { href: "/admin/operations/boarding", label: "Boarding Management", icon: "🏠" },
  { href: "/admin/operations/services", label: "Service Managment", icon: "📋" },
  { href: "/admin/operations/grooming", label: "Grooming Managment", icon: "✂️" },
  { href: "/admin/operations/website", label: "Website Managment", icon: "🌐" },
];

export default function OperationManagementPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-pink">Operation Management</h1>
      <div className="mt-1 border-b-2 border-brand-pink/40" />

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="relative bg-white rounded-2xl shadow-sm border border-pink-100 p-8 flex flex-col items-center text-center hover:border-brand-pink hover:shadow-md transition-all overflow-hidden"
          >
            <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand-pink" />
            <span className="text-5xl">{m.icon}</span>
            <h2 className="mt-4 text-lg font-bold text-zinc-800">{m.label}</h2>
          </Link>
        ))}
      </div>
    </div>
  );
}
