import type { GroomingSession } from "@/lib/data/grooming-sessions-mock";
import SessionCard from "./SessionCard";

export default function GroomerGroup({
  groomerName,
  sessions,
  onView,
}: {
  groomerName: string;
  sessions: GroomingSession[];
  onView: (session: GroomingSession) => void;
}) {
  return (
    <div className="mt-6">
      <h3 className="font-bold text-zinc-800">
        {groomerName} <span className="text-zinc-500 font-normal">( {sessions.length} Sessions )</span>
      </h3>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {sessions.map((session) => (
          <SessionCard key={session.id} session={session} onView={() => onView(session)} />
        ))}
      </div>
    </div>
  );
}
