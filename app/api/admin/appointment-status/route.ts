import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildAppointmentEmail,
  type AppointmentEmailData,
  type EmailAction,
} from "@/lib/email/happytails-appointment-email";

export const runtime = "nodejs";

type Action = EmailAction;

const allowed: Record<Action, string[]> = {
  confirmed: ["pending"],
  completed: ["checked_in"],
  cancelled: ["pending", "confirmed"],
};

async function emailCustomer(appointment: AppointmentEmailData & { customer_id: string | null }, action: Action, reason: string | undefined) {
  if (!process.env.GMAIL_SMTP_USER || !process.env.GMAIL_SMTP_APP_PASSWORD) {
    console.warn("HappyTails appointment email skipped: GMAIL_SMTP_USER or GMAIL_SMTP_APP_PASSWORD is missing");
    return "not_configured";
  }

  if (!appointment.id) return "missing_appointment";

  const admin = createAdminClient();
  const customerId = appointment.customer_id;
  if (!customerId) return "no_customer";

  const { data, error } = await admin.auth.admin.getUserById(customerId);
  const recipientEmail = data.user?.email;
  if (error || !recipientEmail) return "no_email";

  // The logo is a remote image referenced by URL in the HTML, not an email attachment.
  // Configure HAPPYTAILS_EMAIL_LOGO_URL with the public HTTPS URL of /images/logo.png.
  const { subject, html, text } = buildAppointmentEmail({ appointment, action, reason });
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_SMTP_USER,
      pass: process.env.GMAIL_SMTP_APP_PASSWORD,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  const info = await transporter.sendMail({
    from: {
      name: process.env.HAPPYTAILS_EMAIL_FROM_NAME || "HappyTails Pet Grooming Café",
      address: process.env.GMAIL_SMTP_USER,
    },
    to: recipientEmail,
    subject,
    html,
    text,
  });

  return info.accepted.includes(recipientEmail) ? "sent" : "failed";
}

export async function POST(request: Request) {
  try {
    const auth = await createClient();
    const {
      data: { user },
      error: authError,
    } = await auth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await auth
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !["admin", "superadmin"].includes(String(profile?.role))) {
      return NextResponse.json({ error: "Staff access required" }, { status: 403 });
    }

    const input: unknown = await request.json();
    if (!input || typeof input !== "object") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { appointmentId, status, reason } = input as Record<string, unknown>;
    if (
      typeof appointmentId !== "string" ||
      !/^[a-f\d-]{36}$/i.test(appointmentId) ||
      typeof status !== "string" ||
      !["confirmed", "completed", "cancelled"].includes(status)
    ) {
      return NextResponse.json({ error: "Invalid appointment or status" }, { status: 400 });
    }

    const action = status as Action;
    if (
      action === "cancelled" &&
      (typeof reason !== "string" || reason.trim().length < 5 || reason.trim().length > 500)
    ) {
      return NextResponse.json(
        { error: "Enter a cancellation reason between 5 and 500 characters" },
        { status: 400 }
      );
    }

    const { data: current, error: lookupError } = await auth
      .from("appointments")
      .select("id,status")
      .eq("id", appointmentId)
      .single();

    if (lookupError || !current) {
      return NextResponse.json({ error: lookupError?.message ?? "Appointment not found" }, { status: 404 });
    }

    if (!allowed[action].includes(current.status)) {
      return NextResponse.json(
        { error: `Cannot ${action} an appointment in ${current.status} status` },
        { status: 409 }
      );
    }

    if (action === "cancelled") {
      const { error } = await auth.rpc("happytails_staff_cancel_appointment", {
        p_appointment_id: appointmentId,
        p_reason: (reason as string).trim(),
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    } else {
      const { data, error } = await auth
        .from("appointments")
        .update({ status: action })
        .eq("id", appointmentId)
        .eq("status", current.status)
        .select("id")
        .maybeSingle();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      if (!data) {
        return NextResponse.json(
          { error: "Appointment was already changed by another user" },
          { status: 409 }
        );
      }
    }

    let delivery = "failed";
    try {
      const { data: appointment, error } = await auth
        .from("appointments")
        .select(
          "id,customer_id,owner_name,service_type,scheduled_date,scheduled_time,drop_off_at,pick_up_at,appointment_pets(pets(name),packages(name))"
        )
        .eq("id", appointmentId)
        .single();

      if (error) throw error;
      if (!appointment) throw new Error("Appointment details were not found");

      // Supabase's relationship inference can return joined pets/packages as arrays.
      // Normalize those joins before passing them to the email template.
      const emailAppointment: AppointmentEmailData & { customer_id: string | null } = {
        ...appointment,
        appointment_pets: (appointment.appointment_pets ?? []).map((row) => ({
          pets: Array.isArray(row.pets) ? (row.pets[0] ?? null) : (row.pets ?? null),
          packages: Array.isArray(row.packages) ? (row.packages[0] ?? null) : (row.packages ?? null),
        })),
      };
      delivery = await emailCustomer(
        emailAppointment,
        action,
        typeof reason === "string" ? reason.trim() : undefined
      );
    } catch (error) {
      console.error("HappyTails appointment email delivery failed", error);
    }

    return NextResponse.json({ ok: true, delivery });
  } catch (error) {
    console.error("Appointment status request failed", error);
    return NextResponse.json({ error: "Unable to process appointment" }, { status: 500 });
  }
}
