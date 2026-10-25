import Link from 'next/link';
export default function Layout({children}:{children:React.ReactNode}){
 return <><div className="mb-4 flex flex-wrap gap-2">
  <Link href="/admin/website-management" className="rounded-full border border-brand-pink bg-white px-4 py-2 text-sm font-semibold text-brand-pink">Website preview</Link>
  <Link href="/admin/website-management/content" className="rounded-full bg-brand-pink px-4 py-2 text-sm font-semibold text-white">Edit website text, services & package images</Link>
  <Link href="/admin/website-management/branches" className="rounded-full border border-brand-pink bg-white px-4 py-2 text-sm font-semibold text-brand-pink">Manage Other Branches</Link>
 </div>{children}</>;
}
