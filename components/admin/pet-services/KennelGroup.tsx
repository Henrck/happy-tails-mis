import type { Kennel } from "@/lib/data/boarding-kennels-mock";
import KennelCard from "./KennelCard";

export default function KennelGroup({
  title,
  kennels,
  onView,
}: {
  title: string;
  kennels: Kennel[];
  onView: (kennel: Kennel) => void;
}) {
  return (
    <div className="mt-6">
      <h3 className="font-bold text-zinc-800">{title}</h3>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {kennels.map((kennel) => (
          <KennelCard key={kennel.id} kennel={kennel} onView={() => onView(kennel)} />
        ))}
      </div>
    </div>
  );
}
