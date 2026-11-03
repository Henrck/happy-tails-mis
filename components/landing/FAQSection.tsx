import type { FAQItem } from "@/lib/website/faq";

export default function FAQSection({ items }: { items: FAQItem[] }) {
  const published = items.filter(item => item.published && item.question.trim() && item.answer.trim());
  if (!published.length) return null;
  return (
    <section id="faq" aria-labelledby="faq-heading" className="bg-white py-14 sm:py-20">
      <div className="site-container mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-9 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-pink">Helpful answers</p>
          <h2 id="faq-heading" className="mt-2 text-2xl font-extrabold text-zinc-900 sm:text-3xl">Frequently Asked Questions</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">Everything you need to know before booking a HappyTails visit.</p>
        </div>
        <div className="space-y-3">
          {published.map((item, index) => (
            <details key={item.id} className="group rounded-2xl border border-pink-100 bg-[#fff9fc] shadow-sm open:border-pink-200 open:bg-white">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left font-semibold text-zinc-800 marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 items-start gap-3"><span className="shrink-0 text-brand-pink">{String(index + 1).padStart(2, "0")}</span><span>{item.question}</span></span>
                <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xl font-normal text-brand-pink transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="whitespace-pre-line break-words border-t border-pink-100 px-5 py-4 pl-12 text-sm leading-7 text-zinc-600 sm:text-base">{item.answer}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
