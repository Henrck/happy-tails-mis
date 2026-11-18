// Branch directory: each branch as a wide card with its photo, address and Facebook link.
import Image from "next/image";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { WebsiteBranch } from "@/lib/types/website-branches";

export default function HomeBranches({ branches, heading, subheading }: { branches: WebsiteBranch[]; heading: string; subheading: string }) {
  if (!branches.length) return null;
  return <section id="branches" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
    <div className="grid gap-10 lg:grid-cols-[0.8fr_2fr]">
      <div className="lg:sticky lg:top-28 lg:self-start">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-pink">Find us</p>
        <h2 className="mt-3 text-4xl font-bold tracking-tight text-[#2A1626] sm:text-5xl">{heading}</h2>
        <p className="mt-3 text-base text-zinc-500">{subheading}</p>
        <p className="mt-6 font-heading text-6xl font-bold text-brand-pink/20" aria-hidden="true">{String(branches.length).padStart(2, "0")}</p>
      </div>
      <ul className="grid gap-5 sm:grid-cols-2">
        {branches.map((branch) => <li key={branch.id}>
          <a href={branch.facebook_url} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${branch.name} on Facebook (opens new tab)`}
            className="group flex h-full flex-col overflow-hidden rounded-[26px] border border-pink-100 bg-white transition hover:-translate-y-1 hover:shadow-[0_18px_40px_-18px_rgba(212,43,124,0.35)]">
            <div className="relative aspect-[16/10] overflow-hidden bg-[#F3E7EE]">
              {branch.image_url
                ? <Image src={branch.image_url} alt={`${branch.name} branch`} fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized/>
                : <div className="flex h-full items-center justify-center text-5xl" aria-hidden="true">🐾</div>}
              <span className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand-pink shadow transition group-hover:bg-brand-pink group-hover:text-white"><ArrowUpRight size={18}/></span>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h3 className="text-xl font-bold text-[#2A1626]">{branch.name}</h3>
              <p className="mt-2 flex items-start gap-2 text-sm text-zinc-600"><MapPin size={16} className="mt-0.5 shrink-0 text-brand-pink"/><span className="break-words">{branch.location}</span></p>
              {branch.description && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-zinc-500">{branch.description}</p>}
            </div>
          </a>
        </li>)}
      </ul>
    </div>
  </section>;
}
