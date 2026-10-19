'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import type { GalleryPhoto } from '@/lib/types/gallery';
import GalleryCard from '@/components/gallery/GalleryCard';
import GalleryLightbox from '@/components/gallery/GalleryLightbox';
const PAGE_SIZE=3;
export default function Gallery({photos,heading='Happy Tails, Happy Pets',subheading='A few before-and-afters from our grooming table.'}:{photos:GalleryPhoto[];heading?:string;subheading?:string}){
const [page,setPage]=useState(0),[paused,setPaused]=useState(false),[lightboxIndex,setLightboxIndex]=useState<number|null>(null);
const count=Math.max(1,Math.ceil(photos.length/PAGE_SIZE));const visible=photos.slice(page*PAGE_SIZE,page*PAGE_SIZE+PAGE_SIZE);
useEffect(()=>{if(count<=1||paused||lightboxIndex!==null)return;const id=window.setInterval(()=>setPage(p=>(p+1)%count),4000);return ()=>window.clearInterval(id)},[count,paused,lightboxIndex]);
return <section className="bg-white py-14"><div className="site-container text-center"><h2 className="text-2xl font-bold text-zinc-900 md:text-3xl">{heading}</h2><p className="mt-2 text-sm text-zinc-600 md:text-base">{subheading}</p>{visible.length?<div className="mt-8" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)}><div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 md:gap-8">{visible.map(photo=><GalleryCard key={photo.id} photo={photo} onClick={()=>setLightboxIndex(photos.findIndex(p=>p.id===photo.id))}/>)}</div><div className="mt-5 flex justify-center gap-4"><button aria-label="Previous before and after photos" onClick={()=>setPage(p=>(p-1+count)%count)} className="h-10 w-10 rounded-full bg-brand-pink text-white">‹</button><button aria-label="Next before and after photos" onClick={()=>setPage(p=>(p+1)%count)} className="h-10 w-10 rounded-full bg-brand-pink text-white">›</button></div></div>:<p className="mt-8 rounded-2xl border border-pink-200 bg-pink-50 p-8 text-sm text-zinc-500">Before-and-after photos will appear here soon.</p>}<Link href="/gallery" className="mt-6 inline-block rounded-full bg-brand-pink px-8 py-2.5 text-sm font-semibold text-white">View More</Link></div>{lightboxIndex!==null&&<GalleryLightbox photos={photos} index={lightboxIndex} onClose={()=>setLightboxIndex(null)} onNavigate={setLightboxIndex}/>}</section>
}
