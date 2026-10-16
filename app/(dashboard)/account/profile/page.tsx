"use client";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasValidCustomerPhone, normalizeCustomerPhone } from "@/lib/utils/customer-phone";
import type { Customer } from "@/lib/types/users";

export default function MyAccountPage() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({ full_name: "", phone_number: "", address: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) setLoading(false); return; }
      const { data } = await supabase.from("customers").select("*").eq("id", user.id).single();
      if (!active) return;
      if (data) {
        setCustomer(data as Customer);
        setForm({ full_name: data.full_name ?? "", phone_number: data.phone_number ?? "", address: data.address ?? "" });
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);
  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!customer || saving) return;
    const phone = normalizeCustomerPhone(form.phone_number);
    if (!hasValidCustomerPhone(phone)) {
      setMessage("Enter a valid Philippine mobile number (09XXXXXXXXX or +639XXXXXXXXX).");
      return;
    }
    if (!form.full_name.trim()) { setMessage("Full name is required."); return; }
    setSaving(true); setMessage("");
    const { data, error } = await createClient().from("customers")
      .update({ full_name: form.full_name.trim(), phone_number: phone, address: form.address.trim() || null })
      .eq("id", customer.id).select("*").single();
    if (error || !data) setMessage(error?.message ?? "Unable to save account information.");
    else {
      setCustomer(data as Customer);
      setForm((prev) => ({ ...prev, phone_number: phone }));
      setMessage("Account information updated successfully.");
      window.dispatchEvent(new Event("happytails:contact-updated"));
    }
    setSaving(false);
  }
  if (loading) return <p className="py-16 text-center text-zinc-400">Loading account…</p>;
  if (!customer) return <p className="py-16 text-center text-zinc-500">Unable to load your account.</p>;
  const missingPhone = !hasValidCustomerPhone(customer.phone_number);
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-zinc-800 md:text-3xl">My Account</h1><p className="mt-1 text-sm text-zinc-500">Manage the contact information connected to your Happy Tails account.</p></div>
    {missingPhone && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><strong>Complete your account:</strong> Add a mobile number so staff can contact you. Adding pets and booking appointments will be available after saving a valid number.</div>}
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <section className="rounded-3xl border border-pink-100 bg-white p-6">
        <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-brand-tint text-4xl">{customer.profile_picture_url ? <img src={customer.profile_picture_url} alt="" className="h-full w-full object-cover" /> : "🐾"}</div>
        <div className="mt-4 text-center"><h2 className="font-bold text-zinc-800">{customer.full_name}</h2><p className="mt-1 text-xs text-zinc-500">{customer.email ?? "No email on file"}</p><span className="mt-3 inline-flex rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-brand-pink">Client ID: {customer.customer_id}</span></div>
      </section>
      <form onSubmit={saveProfile} className="rounded-3xl border border-pink-100 bg-white p-6 md:p-8">
        <h2 className="text-lg font-bold text-zinc-800">Personal Information</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold text-zinc-700">Full name <span className="text-red-500">*</span></span><input value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} required className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-brand-pink" /></label>
          <label><span className="mb-1.5 block text-sm font-semibold text-zinc-700">Email</span><input value={customer.email ?? ""} disabled className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500" /></label>
          <label><span className="mb-1.5 block text-sm font-semibold text-zinc-700">Phone number <span className="text-red-500">*</span></span><input type="tel" inputMode="tel" autoComplete="tel" placeholder="09XXXXXXXXX" value={form.phone_number} onChange={e=>setForm({...form,phone_number:e.target.value})} required aria-invalid={!!form.phone_number && !hasValidCustomerPhone(form.phone_number)} className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-brand-pink" /><span className="mt-1 block text-xs text-zinc-500">Philippine mobile number (09 or +63 format)</span></label>
          <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold text-zinc-700">Address</span><textarea value={form.address} onChange={e=>setForm({...form,address:e.target.value})} rows={3} className="w-full resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-brand-pink" /></label>
        </div>
        <div className="mt-6 flex items-center justify-between gap-4"><p role="status" className={`text-sm ${message.includes("successfully")?"text-green-600":"text-red-600"}`}>{message}</p><button type="submit" disabled={saving} className="rounded-xl bg-brand-pink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save Changes"}</button></div>
      </form>
    </div>
  </div>;
}
