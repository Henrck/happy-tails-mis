import type { ReactNode } from "react";

/** Replaces legacy fixed-copy section headers without changing live pricing logic. */
export default function LandingTextSection({ heading, subheading, children, tone = "light" }: {
  heading: string;
  subheading: string;
  children: ReactNode;
  tone?: "light" | "pink";
}) {
  const pink = tone === "pink";
  return <div className={`${pink ? "bg-brand-pink" : "bg-brand-tint"} [&>section]:!pt-0 [&>section_.site-container>header]:!hidden`}>
    <header className="site-container pt-8 text-center md:pt-9 lg:pt-10">
      <h2 className={`text-3xl font-extrabold uppercase tracking-tight md:text-4xl ${pink ? "text-white" : "text-brand-pink-dark"}`}>{heading}</h2>
      <p className={`mx-auto mt-2 max-w-3xl text-sm md:text-base ${pink ? "text-white/90" : "text-zinc-700"}`}>{subheading}</p>
    </header>
    {children}
  </div>;
}
