import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
import { boardingReminderEmail } from "@/lib/email/happytails-boarding-reminder";

export const runtime = "nodejs";
export const maxDuration = 60;

type Related<T> = T | T[] | null;
type Appointment = { id: string; owner_name: string; customer_id: string | null; scheduled_date: string; pick_up_at: string | null; status: string; service_type: string };
type Pet = { name: string };
type Row = { id: string; status: string; actual_checkout_at: string | null; planned_pet_pickup_at: string | null; appointments: Related<Appointment>; pets: Related<Pet> };
const first = <T,>(value: Related<T>): T | null => Array.isArray(value) ? (value[0] ?? null) : value;
const manilaDate = (date: Date): string => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type: string) => parts.find(x => x.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};
const nextDay = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.GMAIL_SMTP_USER || !process.env.GMAIL_SMTP_APP_PASSWORD) {
    return NextResponse.json({ error: "Google SMTP is not configured" }, { status: 503 });
  }
  const admin = createAdminClient();
  const tomorrow = nextDay(manilaDate(new Date()));
  const mailer = nodemailer.createTransport({
    host: "smtp.gmail.com", port: 465, secure: true,
    auth: { user: process.env.GMAIL_SMTP_USER, pass: process.env.GMAIL_SMTP_APP_PASSWORD },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  });
  let sent = 0, skipped = 0, failed = 0, checked = 0;
  try {
    // Pagination avoids Supabase's default 1000-row cap. Filter on the effective
    // per-pet pickup date after the query: it may override the parent booking.
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await admin.from("appointment_pets")
        .select("id,status,actual_checkout_at,planned_pet_pickup_at,appointments!inner(id,owner_name,customer_id,scheduled_date,pick_up_at,status,service_type),pets(name)")
        .eq("appointments.service_type", "boarding")
        .eq("appointments.status", "checked_in")
        .neq("status", "completed")
        .is("actual_checkout_at", null)
        .order("id", { ascending: true })
        .range(offset, offset + 499);
      if (error) throw error;
      const rows = (data ?? []) as unknown as Row[];
      for (const row of rows) {
        checked++;
        const booking = first(row.appointments);
        const pet = first(row.pets);
        const pickup = row.planned_pet_pickup_at || booking?.pick_up_at;
        if (!booking || !pickup || !pet || !booking.customer_id || !Number.isFinite(Date.parse(pickup)) || manilaDate(new Date(pickup)) !== tomorrow) {
          skipped++; continue;
        }
        // The database primary key ensures simultaneous runs cannot claim the same
        // pet and exact pickup timestamp twice. A failed send remains visible for review.
        const { error: claimError } = await admin.from("boarding_pickup_email_reminders")
          .insert({ appointment_pet_id: row.id, pickup_at: pickup, status: "claimed" });
        if (claimError) {
          if (claimError.code === "23505") { skipped++; continue; }
          throw claimError;
        }
        try {
          const { data: account, error: accountError } = await admin.auth.admin.getUserById(booking.customer_id);
          if (accountError || !account.user?.email) {
            await admin.from("boarding_pickup_email_reminders").update({ status: "no_email", error_message: "Registered customer email unavailable" }).eq("appointment_pet_id", row.id).eq("pickup_at", pickup);
            skipped++; continue;
          }
          const message = boardingReminderEmail({ appointmentId: booking.id, customerName: booking.owner_name, petName: pet.name, pickupAt: pickup, scheduledDate: booking.scheduled_date });
          const result = await mailer.sendMail({
            from: { name: process.env.HAPPYTAILS_EMAIL_FROM_NAME || "HappyTails Pet Grooming Café", address: process.env.GMAIL_SMTP_USER },
            to: account.user.email, ...message,
          });
          if (!result.accepted.includes(account.user.email)) throw new Error("SMTP did not accept the recipient");
          const { error: logError } = await admin.from("boarding_pickup_email_reminders")
            .update({ status: "sent", sent_at: new Date().toISOString(), error_message: null })
            .eq("appointment_pet_id", row.id).eq("pickup_at", pickup);
          if (logError) console.error("Reminder delivered, but recording delivery failed", logError);
          sent++;
        } catch (e) {
          failed++;
          const errorMessage = e instanceof Error ? e.message : "Unknown email failure";
          await admin.from("boarding_pickup_email_reminders")
            .update({ status: "failed", error_message: errorMessage.slice(0, 500) })
            .eq("appointment_pet_id", row.id).eq("pickup_at", pickup);
          console.error("Boarding pickup reminder failed", row.id, errorMessage);
        }
      }
      if (rows.length < 500) break;
    }
    return NextResponse.json({ ok: true, pickupDate: tomorrow, checked, sent, skipped, failed });
  } catch (e) {
    console.error("Boarding pickup reminders failed", e);
    return NextResponse.json({ error: "Unable to complete reminders", checked, sent, failed }, { status: 500 });
  }
}
