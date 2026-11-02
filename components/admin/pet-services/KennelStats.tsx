/**
 * Kennel dashboard summary.
 *
 * Boarding Management can supply aggregate physical occupancy counts, while
 * older callers can still supply per-kennel session snapshots. Supporting both
 * shapes keeps the statistics component compatible with earlier screens.
 */
type KennelStatSession = {
  stage: "booked" | "checked_in" | "checked_out" | "cancelled";
};

type KennelStatItem = {
  session: KennelStatSession | null;
};

type KennelStatsProps =
  | { kennels: KennelStatItem[] }
  | { small: number; big: number; occupied: number };

export default function KennelStats(props: KennelStatsProps) {
  let total: number;
  let inProgress: number;
  let scheduled: number;
  let available: number;

  if ("kennels" in props) {
    // Backward-compatible input: one item per physical kennel.
    total = props.kennels.length;
    inProgress = props.kennels.filter((k) => k.session?.stage === "checked_in").length;
    scheduled = props.kennels.filter((k) => k.session?.stage === "booked").length;
    available = props.kennels.filter((k) => !k.session).length;
  } else {
    // Current Boarding Management passes physical capacity and the count of
    // unique occupied kennel IDs, not the number of checked-in pets. This
    // correctly counts two pets sharing one kennel as one occupied kennel.
    total = props.small + props.big;
    inProgress = props.occupied;
    scheduled = 0; // Future reservations are not physical occupancy.
    available = Math.max(0, total - inProgress);
  }

  const cards = [
    { label: "Total Kennels", value: total, dot: null, extra: "🏠" },
    { label: "In progress", value: inProgress, dot: "bg-red-500" },
    { label: "Scheduled", value: scheduled, dot: "bg-yellow-400" },
    { label: "Available Kennels", value: available, dot: "bg-green-500" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl border border-pink-100 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-700">{card.label}</span>
            {card.dot ? (
              <span className={`h-3 w-3 rounded-full ${card.dot}`} />
            ) : (
              <span aria-hidden>{card.extra}</span>
            )}
          </div>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
