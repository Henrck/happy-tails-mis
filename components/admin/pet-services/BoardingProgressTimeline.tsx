import type { BoardingStage } from "@/lib/data/boarding-kennels-mock";

const steps: { key: BoardingStage; label: string }[] = [
  { key: "booked", label: "Booked" },
  { key: "checked_in", label: "Check in" },
  { key: "checked_out", label: "Check out" },
];

export default function BoardingProgressTimeline({ stage }: { stage: BoardingStage }) {
  const currentIndex = steps.findIndex((s) => s.key === stage);

  return (
    <div className="flex items-center">
      {steps.map((step, i) => {
        const isDone = i <= currentIndex;
        const isLast = i === steps.length - 1;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  isDone ? "bg-brand-pink border-brand-pink text-white" : "border-brand-pink-light text-brand-pink-light"
                }`}
              >
                {isDone ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-current" />
                )}
              </div>
              <span className="text-[10px] font-medium text-zinc-500 whitespace-nowrap">{step.label}</span>
            </div>
            {!isLast && (
              <div className={`flex-1 h-0.5 mx-1 ${i < currentIndex ? "bg-brand-pink" : "bg-brand-pink-light"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
