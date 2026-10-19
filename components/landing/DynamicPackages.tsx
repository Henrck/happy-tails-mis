import Image from 'next/image';
import type { WebsitePackage, WebsitePrice, WebsiteInclusion, WebsitePackageMedia } from '@/lib/website/catalog';

type Props = { heading:string; subheading:string; types:string[]; packages:WebsitePackage[]; prices:WebsitePrice[]; inclusions:WebsiteInclusion[]; media:WebsitePackageMedia[] };
const pesos=(n:number)=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:2}).format(n);
export default function DynamicPackages({heading,subheading,types,packages,prices,inclusions,media}:Props){
 const cards=packages.filter(p=>p.is_active && types.includes(p.service_type) && media.find(m=>m.package_id===p.id)?.published!==false);
 if(!cards.length) return null;
 return <section className="bg-brand-tint py-10"><div className="site-container">
  <h2 className="text-center text-2xl font-bold text-brand-pink-dark md:text-3xl">{heading}</h2><p className="mt-2 text-center text-sm text-zinc-600 md:text-base">{subheading}</p>
  <div className="mt-7 grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3">
   {cards.map(pkg=>{const picture=media.find(m=>m.package_id===pkg.id);const lines=prices.filter(x=>x.package_id===pkg.id); const included=inclusions.filter(x=>x.package_id===pkg.id).sort((a,b)=>a.sort_order-b.sort_order);return <article key={pkg.id} className="overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-md">
    {picture?.image_url && <div className="relative aspect-[16/10] w-full"><Image src={picture.image_url} alt={pkg.name} fill unoptimized className="object-cover" /></div>}
    <div className="p-5"><h3 className="text-xl font-bold text-brand-pink">{pkg.name}</h3>
    {picture?.description && <p className="mt-2 text-sm text-zinc-600">{picture.description}</p>}
    {included.length>0 && <ul className="mt-4 flex flex-wrap gap-2">{included.map(i=><li key={i.id} className="rounded-full bg-pink-50 px-3 py-1 text-xs text-zinc-700">{i.label}</li>)}</ul>}
    <div className="mt-5 divide-y divide-pink-100">{lines.map(rate=><div key={rate.id} className="flex items-center justify-between gap-2 py-2 text-sm"><span className="text-zinc-600">{rate.size_label}{rate.is_per_night?' · per night':''}</span><strong className="whitespace-nowrap text-brand-pink-dark">{pesos(rate.price)}</strong></div>)}</div>
    </div>
   </article>})}
  </div>
 </div></section>;
}
