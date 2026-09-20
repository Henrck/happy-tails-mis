"use client";

// Customer dashboard home.
// Refined to match the approved Happy Tails customer-dashboard reference
// while keeping the existing Supabase-backed pet data and realtime updates.
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  fetchPetsByCustomer,
  subscribeToCustomerPets,
} from "@/lib/supabase/appointments";
import {
  fetchAppointmentsByCustomer,
  subscribeToAppointments,
  type AppointmentRow,
} from "@/lib/supabase/appointment-management";
import type { Pet } from "@/lib/types/appointments";
import type { Customer } from "@/lib/types/users";
import DashboardPetCard from "@/components/dashboard/DashboardPetCard";

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string | null) {
  if (!time) return "Time to be confirmed";

  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function serviceLabel(type: AppointmentRow["service_type"]) {
  return {
    dog_grooming: "Dog Grooming",
    cat_grooming: "Cat Grooming",
    boarding: "Boarding",
    ala_carte: "Ala Carte",
  }[type];
}

function MiniIcon({
  name,
}: {
  name: "calendar" | "paw" | "bag" | "user" | "bolt" | "arrow";
}) {
  const paths = {
    calendar:
      "M4 5h16v16H4zM4 9h16M8 3v4M16 3v4",
    paw:
      "M8 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 13a2 2 0 1 0-4 0 2 2 0 0 0 4 0zM12 21c-3 0-6-1.5-6-4.5S9 13 12 13s6 .5 6 3.5S15 21 12 21z",
    bag:
      "M6 8h12l1 13H5L6 8zM9 8V6a3 3 0 0 1 6 0v2",
    user:
      "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4.5 3.5-7 8-7s8 2.5 8 7",
    bolt:
      "M13 2 4 14h7l-1 8 9-12h-7l1-8z",
    arrow:
      "M5 12h13M13 6l6 6-6 6",
  };

  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export default function MyPetsPage() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const loadDashboard = useCallback(async (id: string) => {
    const [{ pets: petRows }, { rows: appointmentRows }] = await Promise.all([
      fetchPetsByCustomer(id),
      fetchAppointmentsByCustomer(id),
    ]);

    setPets(petRows);
    setAppointments(appointmentRows);
  }, []);

  useEffect(() => {
    async function init() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: customerRow } = await supabase
        .from("customers")
        .select("*")
        .eq("id", user.id)
        .single();

      setCustomer(customerRow);
      setUserId(user.id);

      await loadDashboard(user.id);
      setLoading(false);
    }

    init();
  }, [loadDashboard]);

  useEffect(() => {
    if (!userId) return;

    const unsubscribePets = subscribeToCustomerPets(userId, () =>
      loadDashboard(userId)
    );

    const unsubscribeAppointments = subscribeToAppointments(() =>
      loadDashboard(userId)
    );

    return () => {
      unsubscribePets();
      unsubscribeAppointments();
    };
  }, [userId, loadDashboard]);

  const firstName = customer?.full_name?.split(" ")[0] ?? "there";
  const today = localDateKey();

  const upcomingAppointment = useMemo(() => {
    return (
      appointments
        .filter(
          (appt) =>
            (appt.status === "pending" ||
              appt.status === "confirmed" ||
              appt.status === "checked_in") &&
            appt.scheduled_date >= today
        )
        .sort((a, b) =>
          `${a.scheduled_date}T${a.scheduled_time ?? "23:59"}`.localeCompare(
            `${b.scheduled_date}T${b.scheduled_time ?? "23:59"}`
          )
        )[0] ?? null
    );
  }, [appointments, today]);

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-zinc-400">
        Loading your Happy Tails dashboard…
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Welcome */}
      <section className="relative overflow-hidden rounded-[28px] border border-pink-100 bg-gradient-to-r from-pink-50 via-white to-pink-50 px-6 py-6 shadow-sm md:px-10 md:py-7">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-start gap-4">
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-pink/10 text-brand-pink sm:flex">
              <MiniIcon name="paw" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800 md:text-3xl">
                Welcome,{" "}
                <span className="text-brand-pink">{firstName}!</span>
              </h1>

              <p className="mt-1.5 text-sm text-slate-500 md:text-base">
                Your furry friends are always in good hands. Here’s a quick
                look at your pets and upcoming activities.
              </p>

              {customer?.customer_id && (
                <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-pink-100">
                  <span className="text-brand-pink">●</span>
                  Client ID: {customer.customer_id}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute -right-8 -top-12 h-52 w-52 rounded-full bg-pink-100/70" />

        <div className="pointer-events-none absolute right-10 top-7 hidden items-end gap-1 text-7xl sm:flex">
          <span className="-rotate-6 drop-shadow-sm">🐕</span>
          <span className="-ml-4 mt-8 rotate-6 drop-shadow-sm">🐈</span>
        </div>

        <div className="pointer-events-none absolute bottom-4 right-8 text-2xl text-brand-pink/50">
          ♥
        </div>
      </section>

      {/* Registered pets */}
      {pets.length > 0 ? (
        <section className="mt-7">
          <div className="flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800 md:text-xl">
              <span className="text-brand-pink">
                <MiniIcon name="paw" />
              </span>
              Your Registered Pets
            </h2>

            <Link
              href="/account/pets"
              className="hidden items-center gap-1 text-sm font-semibold text-brand-pink hover:text-brand-pink-dark sm:flex"
            >
              View All Pets
              <MiniIcon name="arrow" />
            </Link>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pets.slice(0, 3).map((pet) => (
              <DashboardPetCard key={pet.id} pet={pet} />
            ))}
          </div>

          {pets.length > 3 && (
            <Link
              href="/account/pets"
              className="mt-3 flex items-center justify-center text-sm font-semibold text-brand-pink sm:hidden"
            >
              View all {pets.length} pets
            </Link>
          )}
        </section>
      ) : (
        <section className="mt-7 rounded-2xl border-2 border-dashed border-pink-200 bg-white px-6 py-10 text-center shadow-sm">
          <p className="text-4xl">🐾</p>
          <p className="mt-2 font-semibold text-slate-700">
            No pets registered yet
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Book an appointment and we’ll add your pet’s profile for you.
          </p>

          <Link
            href="/account/appointments"
            className="mt-4 inline-flex rounded-full bg-brand-pink px-5 py-2 text-sm font-semibold text-white hover:bg-brand-pink-dark"
          >
            Book Appointment
          </Link>
        </section>
      )}

      {/* Appointment + quick actions */}
      <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="rounded-2xl border border-pink-100 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center justify-between border-b border-pink-50 pb-4">
            <h2 className="flex items-center gap-3 font-bold text-slate-800">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-pink text-white">
                <MiniIcon name="calendar" />
              </span>
              Upcoming Appointment
            </h2>

            <Link
              href="/account/appointments/history"
              className="flex items-center gap-1 text-xs font-semibold text-brand-pink hover:text-brand-pink-dark"
            >
              View All
              <MiniIcon name="arrow" />
            </Link>
          </div>

          {upcomingAppointment ? (
            <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-pink-50 text-center ring-1 ring-pink-100">
                <span className="text-[10px] font-bold uppercase text-brand-pink">
                  {new Date(
                    `${upcomingAppointment.scheduled_date}T00:00:00`
                  ).toLocaleDateString("en-US", { month: "short" })}
                </span>
                <span className="text-2xl font-bold leading-none text-slate-800">
                  {new Date(
                    `${upcomingAppointment.scheduled_date}T00:00:00`
                  ).getDate()}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(
                    `${upcomingAppointment.scheduled_date}T00:00:00`
                  ).getFullYear()}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-slate-800">
                    {upcomingAppointment.pets.map((pet) => pet.name).join(", ") ||
                      "Your pet"}
                  </p>

                  <span className="rounded-full bg-pink-50 px-2.5 py-1 text-[10px] font-semibold text-brand-pink">
                    {serviceLabel(upcomingAppointment.service_type)}
                  </span>
                </div>

                <div className="mt-2 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
                  <span>🕒 {formatTime(upcomingAppointment.scheduled_time)}</span>
                  <span>
                    📅 {formatDate(upcomingAppointment.scheduled_date)}
                  </span>
                </div>
              </div>

              <Link
                href="/account/appointments/history"
                className="shrink-0 rounded-full border-2 border-brand-pink px-5 py-2 text-sm font-semibold text-brand-pink transition-colors hover:bg-brand-pink hover:text-white"
              >
                View Details
              </Link>
            </div>
          ) : (
            <div className="mt-5 flex flex-col items-center justify-center rounded-xl bg-brand-tint px-6 py-8 text-center">
              <span className="text-3xl">🐾</span>
              <p className="mt-2 font-semibold text-slate-700">
                No upcoming appointments
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Ready for your pet’s next grooming or boarding visit?
              </p>

              <Link
                href="/account/appointments"
                className="mt-3 rounded-full bg-brand-pink px-5 py-2 text-xs font-semibold text-white hover:bg-brand-pink-dark"
              >
                Book an Appointment
              </Link>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-pink-100 bg-white p-5 shadow-sm md:p-6">
          <h2 className="flex items-center gap-3 font-bold text-slate-800">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-pink text-white">
              <MiniIcon name="bolt" />
            </span>
            Quick Actions
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link
              href="/account/appointments"
              className="group flex min-h-20 items-center gap-3 rounded-xl bg-pink-50 px-3 py-3 transition-colors hover:bg-pink-100"
            >
              <span className="text-brand-pink">
                <MiniIcon name="calendar" />
              </span>
              <span className="text-xs font-semibold text-slate-600">
                Book Appointment
              </span>
            </Link>

            <Link
              href="/account/pets"
              className="group flex min-h-20 items-center gap-3 rounded-xl bg-pink-50 px-3 py-3 transition-colors hover:bg-pink-100"
            >
              <span className="text-brand-pink">
                <MiniIcon name="paw" />
              </span>
              <span className="text-xs font-semibold text-slate-600">
                Add New Pet
              </span>
            </Link>

            <Link
              href="/products"
              className="group flex min-h-20 items-center gap-3 rounded-xl bg-pink-50 px-3 py-3 transition-colors hover:bg-pink-100"
            >
              <span className="text-brand-pink">
                <MiniIcon name="bag" />
              </span>
              <span className="text-xs font-semibold text-slate-600">
                Shop Products
              </span>
            </Link>

            <Link
              href="/account/profile"
              className="group flex min-h-20 items-center gap-3 rounded-xl bg-pink-50 px-3 py-3 transition-colors hover:bg-pink-100"
            >
              <span className="text-brand-pink">
                <MiniIcon name="user" />
              </span>
              <span className="text-xs font-semibold text-slate-600">
                Update Profile
              </span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
