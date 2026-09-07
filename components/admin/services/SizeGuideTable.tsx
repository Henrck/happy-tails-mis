import type { PetSize } from "@/lib/types/services";

export default function SizeGuideTable({
  sizes,
  onEdit,
  onToggleActive,
  onArchive,
}: {
  sizes: PetSize[];
  onEdit: (size: PetSize) => void;
  onToggleActive: (size: PetSize) => void;
  onArchive: (size: PetSize) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-pink-100 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-brand-pink to-brand-pink-dark text-white">
            {["Size Label", "Weight Range", "Status", "Action"].map((h) => (
              <th key={h} className="text-left font-semibold px-5 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {sizes.length === 0 ? (
            <tr><td colSpan={4} className="text-center text-zinc-400 py-8">No sizes defined yet.</td></tr>
          ) : (
            sizes.map((size) => (
              <tr key={size.id} className="border-t border-pink-50">
                <td className="px-5 py-3.5 font-medium text-zinc-800">{size.label}</td>
                <td className="px-5 py-3.5 text-zinc-600">{size.weight_range}</td>
                <td className="px-5 py-3.5 text-zinc-600">{size.is_active ? "Active" : "Inactive"}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <button onClick={() => onEdit(size)} aria-label="Edit" className="w-7 h-7 rounded-full border-2 border-brand-pink text-brand-pink flex items-center justify-center hover:bg-brand-pink hover:text-white transition-colors">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    <button
                      onClick={() => onToggleActive(size)}
                      className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${size.is_active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-zinc-200 text-zinc-500 hover:bg-zinc-300"}`}
                    >
                      {size.is_active ? "Active" : "Inactive"}
                    </button>
                    <button onClick={() => onArchive(size)} aria-label="Archive" className="w-7 h-7 rounded-full border-2 border-red-300 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4" strokeLinecap="round" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
