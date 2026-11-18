'use client';
// Homepage text (grouped by section, in page order), service tabs and
// package photos. Prices and packages themselves come from Service Management.
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ImagePlus, RotateCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  TEXT_GROUPS, textDefaults, highlightsKey, SERVICE_FALLBACK_IMAGES,
  type WebsiteService, type WebsitePackage, type WebsitePackageMedia,
} from '@/lib/website/catalog';

// Unique storage path per upload; runs only when an image is uploaded, never during render.
const uploadPath = (kind: 'services' | 'packages', id: string, ext: string) => `website-content/${kind}/${id}/${Date.now()}.${ext}`;
const PACKAGE_GROUPS = [
  { type: 'dog_grooming', title: 'Grooming packages', note: 'Shown as the package cards in the Grooming tab.' },
  { type: 'boarding', title: 'Boarding packages', note: 'Small and big kennel cards each use the first package in their group that has a photo or description.' },
];
const card = 'rounded-2xl border border-pink-100 bg-white p-5 shadow-sm sm:p-6';
const input = 'mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm focus:border-brand-pink focus:outline-none focus:ring-2 focus:ring-pink-100';
const primary = 'rounded-full bg-brand-pink px-5 py-2 text-sm font-semibold text-white hover:bg-brand-pink-dark disabled:opacity-50';
const outline = 'inline-flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-brand-pink px-4 py-1.5 text-sm font-semibold text-brand-pink hover:bg-brand-tint';

export default function ContentEditor() {
  const [text, setText] = useState<Record<string, string>>({ ...textDefaults });
  const [saved, setSaved] = useState<Record<string, string>>({ ...textDefaults });
  const [services, setServices] = useState<WebsiteService[]>([]);
  const [packages, setPackages] = useState<WebsitePackage[]>([]);
  const [media, setMedia] = useState<WebsitePackageMedia[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [status, setStatus] = useState('');
  const [loaded, setLoaded] = useState(false);
  const scrolled = useRef(false);
  const db = createClient();

  async function reload() {
    const [a, b, c, d] = await Promise.all([
      db.from('website_text').select('*'), db.from('website_services').select('*').order('sort_order'),
      db.from('packages').select('id,service_type,name,sort_order,is_active').eq('is_active', true).order('sort_order'),
      db.from('website_package_media').select('*'),
    ]);
    const e = [a.error, b.error, c.error, d.error].find(Boolean);
    if (e) { setError(e.message); return; }
    const current = { ...textDefaults, ...Object.fromEntries((a.data ?? []).map(x => [x.key, x.value])) };
    setText(current); setSaved(current);
    setServices((b.data ?? []) as WebsiteService[]); setPackages((c.data ?? []) as WebsitePackage[]); setMedia((d.data ?? []) as WebsitePackageMedia[]);
    setLoaded(true);
  }
  useEffect(() => { void reload(); }, []);
  // Jump to the section the preview's Edit button pointed at, once content is on the page.
  useEffect(() => {
    if (!loaded || scrolled.current) return;
    scrolled.current = true;
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [loaded]);

  async function run(message: string, fn: () => Promise<void>) {
    setBusy(true); setError(''); setStatus('');
    try { await fn(); setStatus(message); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Operation failed'); }
    finally { setBusy(false); }
  }
  async function saveTexts(keys: string[]) {
    const now = new Date().toISOString();
    const { error } = await db.from('website_text').upsert(keys.map(key => ({ key, value: text[key] ?? '', updated_at: now })), { onConflict: 'key' });
    if (error) throw error;
  }
  async function patchService(id: string, patch: Partial<WebsiteService>) {
    const { error } = await db.from('website_services').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  }
  async function patchMedia(id: string, patch: Partial<WebsitePackageMedia>) {
    const { error } = await db.from('website_package_media').upsert({ package_id: id, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'package_id' });
    if (error) throw error;
  }
  async function upload(file: File, kind: 'services' | 'packages', id: string) {
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) throw Error('Choose an image up to 8 MB.');
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) throw Error('Use JPG, PNG, or WebP.');
    const path = uploadPath(kind, id, ext);
    const { error } = await db.storage.from('site-images').upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    const url = db.storage.from('site-images').getPublicUrl(path).data.publicUrl;
    if (kind === 'services') await patchService(id, { image_url: url }); else await patchMedia(id, { image_url: url });
  }

  return <div className="mx-auto max-w-5xl space-y-8 pb-16">
    <header>
      <h1 className="text-2xl font-bold text-brand-pink">Website text & photos</h1>
      <p className="mt-1 text-sm text-zinc-500">Super Admin only. Saved changes appear on the public homepage right away.</p>
      <nav aria-label="Jump to" className="mt-4 flex flex-wrap gap-2">
        {[...TEXT_GROUPS.map(g => ({ id: g.id, title: g.title })), { id: 'service-cards', title: 'Service tabs' }, { id: 'package-photos', title: 'Package photos' }]
          .map(link => <a key={link.id} href={`#${link.id}`} className="rounded-full bg-brand-tint px-3 py-1.5 text-xs font-semibold text-brand-pink hover:bg-pink-100">{link.title}</a>)}
      </nav>
    </header>
    <div className="sticky top-2 z-10 space-y-2 empty:hidden">
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 shadow-sm">{error}</p>}
      {status && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-700 shadow-sm">{status}</p>}
    </div>

    <section aria-labelledby="text-heading" className="space-y-5">
      <h2 id="text-heading" className="text-xl font-bold text-zinc-900">Homepage text <span className="text-sm font-normal text-zinc-500">· in the order it appears on the page</span></h2>
      {TEXT_GROUPS.map(group => {
        const keys = group.fields.map(f => f.key);
        const dirty = keys.some(key => (text[key] ?? '') !== (saved[key] ?? ''));
        return <article key={group.id} id={group.id} className={`${card} scroll-mt-24`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-brand-pink">{group.title}</h3>
            {dirty && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Unsaved changes</span>}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {group.fields.map(field => <div key={field.key} className={(field.rows ?? 1) > 2 ? 'md:col-span-2' : ''}>
              <label className="block text-sm font-semibold text-zinc-700" htmlFor={`text-${field.key}`}>{field.label}</label>
              {field.hint && <p className="text-xs text-zinc-500">{field.hint}</p>}
              {(field.rows ?? 1) > 1
                ? <textarea id={`text-${field.key}`} rows={field.rows} value={text[field.key] ?? ''} onChange={e => setText(old => ({ ...old, [field.key]: e.target.value }))} className={input}/>
                : <input id={`text-${field.key}`} value={text[field.key] ?? ''} onChange={e => setText(old => ({ ...old, [field.key]: e.target.value }))} className={input}/>}
            </div>)}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={busy || !dirty} onClick={() => void run(`${group.title} text saved.`, () => saveTexts(keys))} className={primary}>Save {group.title.toLowerCase()}</button>
            {dirty && <button type="button" disabled={busy} onClick={() => setText(old => ({ ...old, ...Object.fromEntries(keys.map(k => [k, saved[k] ?? ''])) }))} className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-500 hover:text-zinc-800">Discard</button>}
          </div>
        </article>;
      })}
    </section>

    <section id="service-cards" aria-labelledby="services-heading" className="scroll-mt-24 space-y-4">
      <div>
        <h2 id="services-heading" className="text-xl font-bold text-zinc-900">Service tabs</h2>
        <p className="mt-1 text-sm text-zinc-500">Each published service is a tab in the Services section. Create and archive services in Service Management.</p>
      </div>
      {services.map(service => <ServiceEditor key={`${service.id}-${service.image_url}`} data={service} highlights={text[highlightsKey(service.slug)] ?? ''} disabled={busy}
        onSave={(patch, highlights) => run(`${patch.title || service.title} saved.`, async () => {
          await patchService(service.id, patch);
          const { error } = await db.from('website_text').upsert({ key: highlightsKey(service.slug), value: highlights, updated_at: new Date().toISOString() }, { onConflict: 'key' });
          if (error) throw error;
        })}
        onUpload={f => run('Service photo updated.', () => upload(f, 'services', service.id))}
        onReset={() => run('Service photo reset to the default.', () => patchService(service.id, { image_url: null }))}/>)}
    </section>

    <section id="package-photos" aria-labelledby="packages-heading" className="scroll-mt-24 space-y-4">
      <div>
        <h2 id="packages-heading" className="text-xl font-bold text-zinc-900">Package photos & descriptions</h2>
        <p className="mt-1 text-sm text-zinc-500">Names, inclusions and prices come from Service Management. A photo here replaces the card&apos;s default photo; the description replaces its short tagline.</p>
      </div>
      {PACKAGE_GROUPS.map(group => {
        const list = packages.filter(pkg => pkg.service_type === group.type);
        if (!list.length) return null;
        return <div key={group.type} className={card}>
          <h3 className="text-lg font-bold text-brand-pink">{group.title}</h3>
          <p className="mt-0.5 text-xs text-zinc-500">{group.note}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {list.map(pkg => {
              const m = media.find(x => x.package_id === pkg.id);
              return <PackageEditor key={`${pkg.id}-${m?.image_url}`} name={pkg.name} initial={m} disabled={busy}
                onSave={p => run(`${pkg.name} saved.`, () => patchMedia(pkg.id, p))}
                onUpload={f => run(`${pkg.name} photo updated.`, () => upload(f, 'packages', pkg.id))}
                onReset={() => run(`${pkg.name} photo reset to the default.`, () => patchMedia(pkg.id, { image_url: null }))}/>;
            })}
          </div>
        </div>;
      })}
    </section>
  </div>;
}

function PhotoPicker({ src, label, isDefault, disabled, onUpload, onReset }: { src?: string | null; label: string; isDefault: boolean; disabled: boolean; onUpload: (f: File) => Promise<void>; onReset: () => Promise<void> }) {
  return <div>
    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-brand-tint">
      {src ? <Image src={src} alt={label} fill sizes="240px" className="object-cover" unoptimized={src.startsWith('http')}/>
        : <div className="flex h-full items-center justify-center text-xs font-semibold text-zinc-400">Default photo</div>}
      {isDefault && src && <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-zinc-600">Default</span>}
    </div>
    <div className="mt-2 flex flex-wrap gap-2">
      <label className={`${outline} ${disabled ? 'pointer-events-none opacity-50' : ''}`}><ImagePlus size={15}/>Upload<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={disabled} onChange={e => { const f = e.target.files?.[0]; if (f) void onUpload(f); e.target.value = ''; }}/></label>
      {!isDefault && <button type="button" disabled={disabled} onClick={() => void onReset()} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800"><RotateCcw size={13}/>Use default</button>}
    </div>
  </div>;
}

function ServiceEditor({ data, highlights, disabled, onSave, onUpload, onReset }: {
  data: WebsiteService; highlights: string; disabled: boolean;
  onSave: (p: Partial<WebsiteService>, highlights: string) => Promise<void>; onUpload: (file: File) => Promise<void>; onReset: () => Promise<void>;
}) {
  const [title, setTitle] = useState(data.title), [description, setDescription] = useState(data.description);
  const [list, setList] = useState(highlights), [sort, setSort] = useState(data.sort_order), [published, setPublished] = useState(data.published);
  const fallback = SERVICE_FALLBACK_IMAGES[data.slug];
  return <article className={`${card} grid gap-5 md:grid-cols-[220px_1fr]`}>
    <PhotoPicker src={data.image_url ?? fallback} label={data.title} isDefault={!data.image_url} disabled={disabled} onUpload={onUpload} onReset={onReset}/>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm font-semibold text-zinc-700">Tab name<input value={title} onChange={e => setTitle(e.target.value)} className={input}/></label>
      <div className="flex items-end gap-4">
        <label className="block text-sm font-semibold text-zinc-700">Order<input type="number" value={sort} onChange={e => setSort(Number(e.target.value))} className={`${input} w-24`}/></label>
        <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-zinc-700"><input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} className="h-4 w-4 accent-brand-pink"/>Published</label>
      </div>
      <label className="block text-sm font-semibold text-zinc-700 sm:col-span-2">Description<textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className={input}/></label>
      <label className="block text-sm font-semibold text-zinc-700 sm:col-span-2">Highlights <span className="font-normal text-zinc-500">· one per line, up to 8</span>
        <textarea rows={4} value={list} onChange={e => setList(e.target.value)} className={input}/></label>
      <div className="sm:col-span-2"><button type="button" disabled={disabled || !title.trim()} onClick={() => void onSave({ title: title.trim(), description, sort_order: sort, published }, list)} className={primary}>Save {data.title}</button></div>
    </div>
  </article>;
}

function PackageEditor({ name, initial, disabled, onSave, onUpload, onReset }: {
  name: string; initial?: WebsitePackageMedia; disabled: boolean;
  onSave: (p: Partial<WebsitePackageMedia>) => Promise<void>; onUpload: (f: File) => Promise<void>; onReset: () => Promise<void>;
}) {
  const [description, setDescription] = useState(initial?.description ?? ''), [published, setPublished] = useState(initial?.published ?? true);
  return <article className="grid gap-4 rounded-xl border border-pink-100 p-4 sm:grid-cols-[150px_1fr]">
    <PhotoPicker src={initial?.image_url} label={name} isDefault={!initial?.image_url} disabled={disabled} onUpload={onUpload} onReset={onReset}/>
    <div>
      <h4 className="font-bold text-zinc-900">{name}</h4>
      <label className="mt-2 block text-sm font-semibold text-zinc-700">Short description
        <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Leave empty to use the default tagline" className={input}/></label>
      <label className="mt-2 flex items-center gap-2 text-sm font-semibold text-zinc-700"><input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} className="h-4 w-4 accent-brand-pink"/>Show on website</label>
      <button type="button" disabled={disabled} onClick={() => void onSave({ description, published })} className={`${primary} mt-3`}>Save</button>
    </div>
  </article>;
}
