import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildRescheduleEmail, type RescheduleEmailDetails } from "@/lib/email/happytails-reschedule-email";

export const runtime = "nodejs";

type Delivery = "sent" | "failed" | "not_configured" | "no_customer" | "no_email";

async function notifyCustomer(customerId: string | null, details: RescheduleEmailDetails): Promise<Delivery> {
  if (!customerId) return "no_customer";
  if (!process.env.GMAIL_SMTP_USER || !process.env.GMAIL_SMTP_APP_PASSWORD) return "not_configured";
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(customerId);
    if (error || !data.user?.email) return "no_email";
    const recipient = data.user.email;
    const mail = buildRescheduleEmail(details);
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com", port: 465, secure: true,
      auth: { user: process.env.GMAIL_SMTP_USER, pass: process.env.GMAIL_SMTP_APP_PASSWORD },
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    });
    const result = await transporter.sendMail({
      from: { name: process.env.HAPPYTAILS_EMAIL_FROM_NAME || "HappyTails Pet Grooming Café", address: process.env.GMAIL_SMTP_USER },
      to: recipient, subject: mail.subject, text: mail.text, html: mail.html,
    });
    return result.accepted.some((email) =>
  (typeof email === "string" ? email : email.address)
    .toLowerCase() === recipient.toLowerCase()
) ? "sent" : "failed";
  } catch (error) {
    console.error("HappyTails reschedule notification failed", error);
    return "failed";
  }
}

export async function POST(request: Request) {
  try {
    const db = await createClient();
    const { data: { user }, error: userError } = await db.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const { data: profile, error: profileError } = await db.from("profiles").select("role").eq("id", user.id).single();
    if (profileError || !["admin", "superadmin"].includes(String(profile?.role))) {
      return NextResponse.json({ error: "Staff access required." }, { status: 403 });
    }
    const input: unknown = await request.json();
    if (!input || typeof input !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    const { appointmentId, date, time, reason } = input as Record<string, unknown>;
    if (typeof appointmentId !== "string" || !/^[0-9a-f-]{36}$/i.test(appointmentId)
      || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)
      || typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
      || typeof reason !== "string" || reason.trim().length < 5 || reason.trim().length > 500) {
      return NextResponse.json({ error: "Enter a valid appointment, date, time, and rescheduling reason (5–500 characters)." }, { status: 400 });
    }

    // The staff-only RPC performs availability validation, saves the reason,
    // and returns the *actual* old schedule in one transaction.
    const { data: old, error: mutationError } = await db.rpc("happytails_reschedule_staff_appointment", {
      p_appointment_id: appointmentId, p_date: date, p_time: time, p_reason: reason.trim(),
    });
    if (mutationError) return NextResponse.json({ error: mutationError.message }, { status: 409 });

    // Never report an email as sent until Gmail accepts it. A notification
    // failure cannot roll back the successfully committed schedule change.
    const { data: appointment, error: lookupError } = await db.from("appointments")
      .select("id,customer_id,owner_name,service_type,scheduled_date,scheduled_time,drop_off_at,pick_up_at,appointment_pets(pets(name))")
      .eq("id", appointmentId).single();
    if (lookupError || !appointment) {
      console.error("Reschedule saved but updated appointment lookup failed", lookupError);
      return NextResponse.json({ ok: true, delivery: "failed" });
    }
    const previous = (old && typeof old === "object" && !Array.isArray(old) ? old : {}) as Record<string, unknown>;
    const petNames = (appointment.appointment_pets ?? []).flatMap(item => {
      const pet = Array.isArray(item.pets) ? item.pets[0] : item.pets;
      return pet?.name ? [pet.name] : [];
    });
    const details: RescheduleEmailDetails = {
      id: appointment.id, ownerName: appointment.owner_name,
      serviceType: appointment.service_type, petNames,
      reason: reason.trim(),
      oldDate: typeof previous.previous_date === "string" ? previous.previous_date : null,
      oldTime: typeof previous.previous_time === "string" ? previous.previous_time : null,
      oldDropOff: typeof previous.previous_drop_off_at === "string" ? previous.previous_drop_off_at : null,
      oldPickUp: typeof previous.previous_pick_up_at === "string" ? previous.previous_pick_up_at : null,
      newDate: appointment.scheduled_date, newTime: appointment.scheduled_time,
      newDropOff: appointment.drop_off_at, newPickUp: appointment.pick_up_at,
    };
    const delivery = await notifyCustomer(appointment.customer_id, details);
    return NextResponse.json({ ok: true, delivery });
  } catch (error) {
    console.error("Appointment rescheduling request failed", error);
    return NextResponse.json({ error: "Unable to process rescheduling." }, { status: 500 });
  }
}
