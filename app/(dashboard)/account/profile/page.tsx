"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Customer } from "@/lib/types/users";

export default function MyAccountPage() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({ full_name: "", phone_number: "", address: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setCustomer(data as Customer);
        setForm({
          full_name: data.full_name ?? "",
          phone_number: data.phone_number ?? "",
          address: data.address ?? "",
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!customer) return;

    setSaving(true);
    setMessage("");

    const supabase = createClient();
    const { data, error } = await supabase
      .from("customers")
      .update({
        full_name: form.full_name.trim(),
        phone_number: form.phone_number.trim() || null,
        address: form.address.trim() || null,
      })
      .eq("id", customer.id)
      .select("*")
      .single();

    if (error) {
      setMessage(error.message);
    } else {
      setCustomer(data as Customer);
      setMessage("Account information updated successfully.");
    }

    setSaving(false);
  }

  if (loading) {
    return <p className="py-16 text-center text-zinc-400">Loading account…</p>;
  }

  if (!customer) {
    return <p className="py-16 text-center text-zinc-500">Unable to load your account.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-800">My Account</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage the contact information connected to your Happy Tails account.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <section className="rounded-3xl border border-pink-100 bg-white p-6">
          <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-brand-tint text-4xl">
            {customer.profile_picture_url ? (
              <img src={customer.profile_picture_url} alt="" className="h-full w-full object-cover" />
            ) : (
              "🐾"
            )}
          </div>
          <div className="mt-4 text-center">
            <h2 className="font-bold text-zinc-800">{customer.full_name}</h2>
            <p className="mt-1 text-xs text-zinc-500">{customer.email ?? "No email on file"}</p>
            <span className="mt-3 inline-flex rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-brand-pink">
              Client ID: {customer.customer_id}
            </span>
          </div>
        </section>

        <form onSubmit={saveProfile} className="rounded-3xl border border-pink-100 bg-white p-6 md:p-8">
          <h2 className="text-lg font-bold text-zinc-800">Personal Information</h2>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className="md:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Full name</span>
              <input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-brand-pink"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Email</span>
              <input value={customer.email ?? ""} disabled className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500" />
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Phone number</span>
              <input
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-brand-pink"
              />
            </label>

            <label className="md:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Address</span>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={3}
                className="w-full resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-brand-pink"
              />
            </label>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <p className={`text-sm ${message.includes("successfully") ? "text-green-600" : "text-red-500"}`}>{message}</p>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand-pink px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
