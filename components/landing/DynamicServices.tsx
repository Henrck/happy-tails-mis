import Image from 'next/image';
import type { WebsiteService } from '@/lib/website/catalog';

const fallbacks: Record<string, string> = {
 'pet-grooming':'/images/grooming-banner-bg.png',
 'pet-boarding':'/images/boarding-banner-bg.png',
 'pet-spa':'/images/spa-banner-bg.png'
};
const icons: Record<string, string> = { bath:'🛁',home:'🏠',sparkles:'✨',paw:'🐾' };
const defaultFeatures: Record<string,string[]> = {
 'pet-grooming':['Gentle Baths','Tidy Trims & Styling','Quality Products','Stress-free Experience'],
 'pet-boarding':['Cozy & Clean Spaces','Attentive Staff','Daily Play & Care','Safe & Secure Environment'],
 'pet-spa':['Herbal & Natural Products','Gentle Massages','Chemical-free Treatments','Relaxation & Well-being']
};
export default function DynamicServices({ services, heading, subheading }: {services: WebsiteService[]; heading:string; subheading:string}) {
 return <section id="services" className="bg-brand-tint py-14"><div className="site-container">
  <h2 className="text-center text-2xl font-bold text-zinc-900 md:text-3xl">{heading}</h2>
  <p className="mt-2 text-center text-sm text-zinc-500 md:text-base">{subheading}</p>
  <div className="mt-8 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 md:gap-8">
  {services.map(s=><article key={s.id} className="flex min-w-0 flex-col overflow-hidden rounded-3xl bg-white shadow-lg">
   <div className="relative aspect-[16/11] w-full bg-pink-100">
    {(s.image_url || fallbacks[s.slug]) ? <Image alt={s.title} src={s.image_url || fallbacks[s.slug]} fill unoptimized={!!s.image_url} className="object-cover" sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"/> : <div className="flex h-full items-center justify-center text-6xl">🐾</div>}
   </div>
   <div className="relative flex flex-1 flex-col items-center px-6 pb-9 text-center">
    <span aria-hidden className="absolute -top-8 left-6 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white text-3xl shadow-md">{icons[s.icon_key] || icons.paw}</span>
    <h3 className="mt-7 text-xl font-bold text-brand-pink md:text-2xl">{s.title}</h3>
    <div aria-hidden className="mt-2 h-px w-20 bg-brand-pink-light" />
    <p className="mt-5 text-sm leading-relaxed text-zinc-600">{s.description}</p>
    {defaultFeatures[s.slug] && <div className="mt-auto grid w-full grid-cols-4 gap-2 pt-7">{defaultFeatures[s.slug].map((feature,i)=><div key={feature} className="flex flex-col items-center gap-2"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-tint text-brand-pink" aria-hidden>{['🐾','✂️','🧴','♡'][i]}</span><span className="text-[10px] leading-tight text-zinc-500 md:text-[11px]">{feature}</span></div>)}</div>}
   </div>
  </article>)}
  </div>
 </div></section>;
}
