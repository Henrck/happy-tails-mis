 "use client";

import { useState } from "react";
import { Cat, House, Sparkles, ArrowLeft, ArrowRight, Check } from "lucide-react";

type ServiceId = "cat-grooming" | "boarding" | "ala-carte";

type ServiceOption = {
  id: ServiceId;
  title: string;
  description: string;
  icon: React.ReactNode;
};

const services: ServiceOption[] = [
  {
    id: "cat-grooming",
    title: "Cat Grooming",
    description: "Bath, grooming, and care for cats.",
    icon: <Cat size={34} strokeWidth={1.8} />,
  },
  {
    id: "boarding",
    title: "Boarding",
    description: "Safe and comfortable stays for your pet.",
    icon: <House size={34} strokeWidth={1.8} />,
  },
  {
    id: "ala-carte",
    title: "Ala Carte",
    description: "Choose individual add-on services.",
    icon: <Sparkles size={34} strokeWidth={1.8} />,
  },
];

export default function ServiceSelection({
  initialValue,
  onBack,
  onNext,
}: {
  initialValue?: ServiceId | null;
  onBack: () => void;
  onNext: (service: ServiceId) => void;
}) {
  const [selected, setSelected] = useState<ServiceId | null>(
    initialValue ?? null
  );

  return (
    <section className="mx-auto w-full max-w-[1185px] rounded-[26px] border border-pink-100 bg-white px-8 py-10 shadow-[0_3px_14px_rgba(31,41,55,0.06)] md:px-10 md:py-11">
      <div className="text-center">
        <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-pink-50 text-pink-500">
          <Sparkles size={22} strokeWidth={2} />
        </div>

        <h1 className="text-[28px] font-extrabold tracking-tight text-pink-500 md:text-[30px]">
          Select Service
        </h1>

        <p className="mt-1 text-[16px] text-slate-500">
          What does your pet need today?
        </p>
      </div>

      <div className="mx-auto mt-8 grid max-w-[650px] grid-cols-1 gap-4 sm:grid-cols-3">
        {services.map((service) => {
          const active = selected === service.id;

          return (
            <button
              key={service.id}
              type="button"
              onClick={() => setSelected(service.id)}
              aria-pressed={active}
              className={[
                "group relative flex min-h-[150px] flex-col items-center justify-center rounded-[18px]",
                "border-2 bg-white px-4 py-6 text-center",
                "transition-all duration-200",
                active
                  ? "border-pink-500 bg-pink-50/50 shadow-[0_4px_14px_rgba(236,72,153,0.12)]"
                  : "border-pink-100 hover:border-pink-300 hover:bg-pink-50/30",
              ].join(" ")}
            >
              <span
                className={[
                  "mb-3 flex h-12 w-12 items-center justify-center rounded-full",
                  "transition-colors",
                  active
                    ? "bg-pink-500 text-white"
                    : "bg-pink-50 text-pink-500 group-hover:bg-pink-100",
                ].join(" ")}
              >
                {service.icon}
              </span>

              <span className="text-[16px] font-bold text-slate-800">
                {service.title}
              </span>

              <span className="mt-1 max-w-[175px] text-[12px] leading-4 text-slate-500">
                {service.description}
              </span>

              {active && (
                <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 text-white">
                  <Check size={14} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mx-auto mt-8 grid max-w-[650px] grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-12 items-center justify-center gap-2 rounded-full border-2 border-slate-200 bg-white text-[15px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          <ArrowLeft size={17} />
          Back
        </button>

        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && onNext(selected)}
          className={[
            "flex h-12 items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition-all",
            selected
              ? "bg-pink-500 text-white shadow-[0_3px_8px_rgba(236,72,153,0.22)] hover:bg-pink-600"
              : "cursor-not-allowed bg-pink-200 text-white",
          ].join(" ")}
        >
          Next
          <ArrowRight size={17} />
        </button>
      </div>
    </section>
  );
}
