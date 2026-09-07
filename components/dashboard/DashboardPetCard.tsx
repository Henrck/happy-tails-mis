import Link from "next/link";
import type { Pet } from "@/lib/types/appointments";

const bannerColors: Record<string, string> = {
  Dog: "from-sky-200 to-sky-100",
  Cat: "from-pink-200 to-pink-100",
};

export default function DashboardPetCard({ pet }: { pet: Pet }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-pink-100">
      <div className={`h-24 bg-gradient-to-br ${bannerColors[pet.species] ?? bannerColors.Dog} flex items-center justify-center`}>
        <span className="text-5xl">{pet.species === "Cat" ? "🐈" : "🐕"}</span>
      </div>
      <div className="p-4">
        <p className="font-bold text-zinc-800">{pet.name}</p>
        <p className="text-sm text-zinc-500">{pet.breed} - {pet.size_label}</p>

        <div className="mt-3 flex gap-2">
          <Link
            href={`/account/appointments?petId=${pet.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 border-2 border-brand-pink text-brand-pink text-xs font-semibold py-2 rounded-full hover:bg-brand-pink hover:text-white transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 5h16v16H4zM4 9h16M8 3v4M16 3v4" /></svg>
            Book
          </Link>
          <Link
            href={`/account/pets/${pet.id}`}
            className="flex-1 flex items-center justify-center bg-brand-pink hover:bg-brand-pink-dark text-white text-xs font-semibold py-2 rounded-full transition-colors"
          >
            View Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
