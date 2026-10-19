'use client';
import { useEffect,useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { WebsiteService } from '@/lib/website/catalog';

export default function ServiceCatalogManagement(){
 const db=createClient();
 const [items,setItems]=useState<WebsiteService[]>([]);
 const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[slug,setSlug]=useState('');
 const [type,setType]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 async function reload(){const r=await db.from('website_services').select('*').order('sort_order');if(r.error)setError(r.error.message);else setItems(r.data as WebsiteService[])}
 useEffect(()=>{void reload()},[]);
 async function act(op:()=>PromiseLike<{error:{message:string}|null}>){setBusy(true);setError('');setNotice('');try{const r=await op();if(r.error)throw Error(r.error.message);setNotice('Saved.');await reload()}catch(e){setError(e instanceof Error?e.message:'Could not save')}finally{setBusy(false)}}
 const cleanSlug=(s:string)=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 return <div className="mx-auto max-w-6xl pb-16"><h1 className="text-2xl font-bold text-brand-pink">Services Catalog</h1><p className="mt-1 text-sm text-zinc-500">Add services to the landing page. Online booking for new service types requires separate scheduling support.</p>
 {error&&<p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}{notice&&<p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-green-700">{notice}</p>}
 <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Create service</h2><div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-sm">Name<input className="mt-1 w-full rounded-lg border p-3" value={title} onChange={e=>{setTitle(e.target.value);setSlug(cleanSlug(e.target.value))}}/></label><label className="text-sm">URL-friendly identifier<input className="mt-1 w-full rounded-lg border p-3" value={slug} onChange={e=>setSlug(cleanSlug(e.target.value))}/></label><label className="text-sm md:col-span-2">Description<textarea rows={3} className="mt-1 w-full rounded-lg border p-3" value={description} onChange={e=>setDescription(e.target.value)}/></label><label className="text-sm">Existing booking type (optional)<select className="mt-1 w-full rounded-lg border p-3" value={type} onChange={e=>setType(e.target.value)}><option value="">Website only (not bookable)</option><option value="dog_grooming">Dog Grooming</option><option value="cat_grooming">Cat Grooming</option><option value="boarding">Boarding</option></select></label></div><button disabled={busy||title.trim().length<2||!slug} className="mt-4 rounded-full bg-brand-pink px-5 py-2 font-semibold text-white disabled:opacity-50" onClick={()=>void act(()=>db.from('website_services').insert({title:title.trim(),slug,description,booking_service_type:type||null,sort_order:100,published:true}).select('id').single().then(x=>{if(!x.error){setTitle('');setDescription('');setSlug('');setType('')}return {error:x.error}}))}>+ Add service</button></section>
 <section className="mt-7 rounded-2xl bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-bold">Existing services</h2><div className="space-y-3">{items.map(s=><div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-pink-100 p-4"><div><h3 className="font-semibold">{s.title}</h3><p className="text-xs text-zinc-500">{s.slug} · {s.booking_service_type||'Website only'}</p></div><button disabled={busy} className="rounded-full border border-brand-pink px-4 py-2 text-sm font-semibold text-brand-pink" onClick={()=>void act(()=>db.from('website_services').update({published:!s.published,updated_at:new Date().toISOString()}).eq('id',s.id).select('id').single())}>{s.published?'Unpublish':'Publish'}</button></div>)}</div></section>
 </div>
}
