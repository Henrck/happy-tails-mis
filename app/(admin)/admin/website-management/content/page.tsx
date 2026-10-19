'use client';
import { useEffect,useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { textDefaults,type WebsiteService,type WebsitePackage,type WebsitePackageMedia } from '@/lib/website/catalog';

export default function ContentEditor(){
 const [text,setText]=useState<Record<string,string>>({...textDefaults});
 const [services,setServices]=useState<WebsiteService[]>([]);
 const [packages,setPackages]=useState<WebsitePackage[]>([]);
 const [media,setMedia]=useState<WebsitePackageMedia[]>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState('');
 const db=createClient();
 async function reload(){const [a,b,c,d]=await Promise.all([db.from('website_text').select('*'),db.from('website_services').select('*').order('sort_order'),db.from('packages').select('id,service_type,name,sort_order,is_active').order('sort_order'),db.from('website_package_media').select('*')]);
  const e=[a.error,b.error,c.error,d.error].find(Boolean);if(e){setError(e.message);return;}
  setText({...textDefaults,...Object.fromEntries((a.data??[]).map(x=>[x.key,x.value]))});setServices((b.data??[]) as WebsiteService[]);setPackages((c.data??[]) as WebsitePackage[]);setMedia((d.data??[]) as WebsitePackageMedia[]);
 }
 useEffect(()=>{void reload()},[]);
 async function run(fn:()=>Promise<void>){setBusy(true);setError('');setStatus('');try{await fn();setStatus('Changes saved.');await reload()}catch(e){setError(e instanceof Error?e.message:'Operation failed')}finally{setBusy(false)}}
 async function saveText(key:string){const {error}=await db.from('website_text').upsert({key,value:text[key]??'',updated_at:new Date().toISOString()},{onConflict:'key'});if(error)throw error;}
 async function patchService(id:string,patch:Partial<WebsiteService>){const {error}=await db.from('website_services').update({...patch,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;}
 async function patchMedia(id:string,patch:Partial<WebsitePackageMedia>){const {error}=await db.from('website_package_media').upsert({package_id:id,...patch,updated_at:new Date().toISOString()},{onConflict:'package_id'});if(error)throw error;}
 async function upload(file:File,kind:'services'|'packages',id:string){
  if(!file.type.startsWith('image/')||file.size>8*1024*1024)throw Error('Choose an image up to 8 MB.');
  const ext=file.name.split('.').pop()?.toLowerCase()??'jpg';if(!['jpg','jpeg','png','webp'].includes(ext))throw Error('Use JPG, PNG, or WebP.');
  const path=`website-content/${kind}/${id}/${Date.now()}.${ext}`;
  const {error}=await db.storage.from('site-images').upload(path,file,{contentType:file.type,upsert:false});if(error)throw error;
  const url=db.storage.from('site-images').getPublicUrl(path).data.publicUrl;
  if(kind==='services')await patchService(id,{image_url:url});else await patchMedia(id,{image_url:url});
 }
 return <div className="mx-auto max-w-6xl space-y-8 pb-16">
  <header><h1 className="text-2xl font-bold text-brand-pink">Website Content & Images</h1><p className="mt-1 text-sm text-zinc-500">Super Admin only. Published changes appear on the public website.</p></header>
  {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}{status&&<p role="status" className="rounded-lg bg-green-50 p-3 text-green-700">{status}</p>}
  <section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="mb-5 text-xl font-bold">Landing page text</h2><div className="grid gap-4 md:grid-cols-2">{Object.keys(textDefaults).map(key=><div key={key}><label className="mb-1 block text-sm font-semibold text-zinc-700" htmlFor={`text-${key}`}>{key.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</label><textarea id={`text-${key}`} rows={key.includes('description')?5:2} value={text[key]??''} onChange={e=>setText(old=>({...old,[key]:e.target.value}))} className="w-full rounded-lg border border-zinc-300 p-3 text-sm"/><button disabled={busy} onClick={()=>void run(()=>saveText(key))} className="rounded-full bg-brand-pink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save text</button></div>)}</div></section>
  <section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="mb-4 text-xl font-bold">Service cards</h2><p className="mb-4 text-sm text-zinc-500">Create and archive services in Service Management. Edit their landing-page presentation here.</p><div className="grid gap-5 md:grid-cols-2">{services.map(service=><ServiceEditor key={service.id} data={service} disabled={busy} onSave={p=>run(()=>patchService(service.id,p))} onUpload={f=>run(()=>upload(f,'services',service.id))}/>)}</div></section>
  <section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="mb-4 text-xl font-bold">Package images & descriptions</h2><p className="mb-4 text-sm text-zinc-500">Packages and pricing come from Service Management. Add a photo and optional marketing description here.</p><div className="grid gap-4 md:grid-cols-2">{packages.map(pkg=>{const m=media.find(x=>x.package_id===pkg.id);return <PackageEditor key={pkg.id} name={`${pkg.name} — ${pkg.service_type}`} initial={m} disabled={busy} onSave={p=>run(()=>patchMedia(pkg.id,p))} onUpload={f=>run(()=>upload(f,'packages',pkg.id))}/>})}</div></section>
 </div>;
}
function ServiceEditor({data,disabled,onSave,onUpload}:{data:WebsiteService;disabled:boolean;onSave:(p:Partial<WebsiteService>)=>Promise<void>;onUpload:(file:File)=>Promise<void>}){
 const [title,setTitle]=useState(data.title),[description,setDescription]=useState(data.description),[sort,setSort]=useState(data.sort_order),[published,setPublished]=useState(data.published);
 return <article className="rounded-xl border border-pink-100 p-4"><h3 className="mb-3 font-bold text-brand-pink">{data.slug}</h3><label className="block text-sm">Title<input value={title} onChange={e=>setTitle(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label><label className="mt-3 block text-sm">Description<textarea rows={4} value={description} onChange={e=>setDescription(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label><div className="mt-3 flex items-center gap-4"><label className="text-sm">Order <input type="number" className="w-20 rounded-lg border p-2" value={sort} onChange={e=>setSort(Number(e.target.value))}/></label><label className="flex gap-2 text-sm"><input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)}/>Published</label></div><div className="mt-4 flex flex-wrap gap-3"><button disabled={disabled} onClick={()=>void onSave({title:title.trim(),description,sort_order:sort,published})} className="rounded-full bg-brand-pink px-4 py-2 text-sm text-white">Save</button><label className="cursor-pointer rounded-full border border-brand-pink px-4 py-2 text-sm text-brand-pink">Upload image<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={disabled} onChange={e=>{const f=e.target.files?.[0];if(f)void onUpload(f);e.target.value=''}}/></label></div>{data.image_url&&<p className="mt-2 truncate text-xs text-zinc-500">Current image: {data.image_url}</p>}</article>
}
function PackageEditor({name,initial,disabled,onSave,onUpload}:{name:string;initial?:WebsitePackageMedia;disabled:boolean;onSave:(p:Partial<WebsitePackageMedia>)=>Promise<void>;onUpload:(f:File)=>Promise<void>}){
 const [description,setDescription]=useState(initial?.description??''),[published,setPublished]=useState(initial?.published??true);
 return <article className="rounded-xl border border-pink-100 p-4"><h3 className="text-sm font-bold">{name}</h3><textarea aria-label={`Description for ${name}`} rows={2} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Optional package description" className="mt-3 w-full rounded-lg border p-2 text-sm"/><label className="mt-2 flex gap-2 text-sm"><input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)}/>Show on website</label><div className="mt-3 flex flex-wrap gap-2"><button disabled={disabled} onClick={()=>void onSave({description,published})} className="rounded-full bg-brand-pink px-4 py-2 text-sm text-white">Save</button><label className="cursor-pointer rounded-full border border-brand-pink px-4 py-2 text-sm text-brand-pink">Upload image<input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)void onUpload(f);e.target.value=''}}/></label></div>{initial?.image_url&&<p className="mt-2 truncate text-xs text-zinc-500">Image: {initial.image_url}</p>}</article>
}
