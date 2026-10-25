export type EmailAction = "confirmed" | "completed" | "cancelled";

export type AppointmentEmailData = {
  id: string;
  owner_name: string;
  service_type: string;
  scheduled_date: string;
  scheduled_time: string | null;
  drop_off_at: string | null;
  pick_up_at: string | null;
  appointment_pets: { pets: { name: string } | null; packages: { name: string } | null }[] | null;
};

const SERVICE_LABELS: Record<string, string> = {
  dog_grooming: "Dog Grooming",
  cat_grooming: "Cat Grooming",
  boarding: "Boarding",
  ala_carte: "À La Carte",
};

const SERVICE_CODES: Record<string, string> = {
  dog_grooming: "DOG",
  cat_grooming: "CAT",
  boarding: "BRD",
  ala_carte: "ALC",
};

const THEME = {
  navy: "#14283e",
  navySoft: "#243b53",
  pink: "#F53D93",
  pinkSoft: "#FDF1F7",
  blush: "#FDF1F7",
  border: "#f3d4e4",
  text: "#25364a",
  muted: "#667085",
  surface: "#ffffff",
  footer: "#f8fafc",
  success: "#16a34a",
  successBg: "#dcfce7",
  amber: "#b45309",
  amberBg: "#fef3c7",
  danger: "#b42318",
  dangerBg: "#fee4e2",
};

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]!));
}

function formatDate(value: string | null) {
  if (!value) return "Not specified";
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00+08:00`) : new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeZone: "Asia/Manila" }).format(parsed);
}

function formatTime(value: string | null) {
  if (!value) return "Not specified";
  const match = /^(\d{2}):(\d{2})/.exec(value);
  if (!match) return value;
  const hours = Number(match[1]);
  return `${hours % 12 || 12}:${match[2]} ${hours < 12 ? "AM" : "PM"}`;
}

function formatDateTime(value: string | null) {
  if (!value) return "Not specified";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });
}

function serviceLabel(type: string) {
  return SERVICE_LABELS[type] ?? "Pet Service";
}

export function displayAppointmentReference(appointmentId: string, serviceType: string, scheduledDate: string | null) {
  const shortId = appointmentId.split("-")[0]?.toUpperCase() || appointmentId.slice(0, 8).toUpperCase();
  const serviceCode = SERVICE_CODES[serviceType] ?? "APT";
  const year = scheduledDate?.slice(0, 4) || new Date().getFullYear().toString();
  return `HT-${serviceCode}-${year}-${shortId}`;
}

function statusCopy(action: EmailAction) {
  if (action === "confirmed") {
    return {
      heading: "Appointment Confirmed",
      bannerLabel: "Confirmed",
      badgeColor: THEME.amber,
      badgeBg: THEME.amberBg,
      intro: "Your appointment has been confirmed by our team. We look forward to welcoming you and your pet at HappyTails Pet Grooming Café.",
      closing: "Please arrive on time and let us know ahead of schedule if you need to make changes to your booking.",
    };
  }
  if (action === "completed") {
    return {
      heading: "Service Completed",
      bannerLabel: "Completed",
      badgeColor: THEME.success,
      badgeBg: THEME.successBg,
      intro: "We’re happy to let you know that your pet’s scheduled service has been completed. Thank you for trusting HappyTails with your companion.",
      closing: "We appreciate your trust and look forward to caring for your pet again soon.",
    };
  }
  return {
    heading: "Appointment Cancelled",
    bannerLabel: "Cancelled",
    badgeColor: THEME.danger,
    badgeBg: THEME.dangerBg,
    intro: "We regret to inform you that your appointment has been cancelled. Please review the details below for reference.",
    closing: "If you would like to rebook or need assistance, please contact HappyTails and we’ll be glad to help.",
  };
}

export function buildAppointmentEmail({
  appointment,
  action,
  reason,
}: {
  appointment: AppointmentEmailData;
  action: EmailAction;
  reason?: string;
}) {
  const content = statusCopy(action);
  const reference = displayAppointmentReference(appointment.id, appointment.service_type, appointment.scheduled_date);
  const pets = (appointment.appointment_pets ?? [])
    .map((row) => row.pets?.name?.trim())
    .filter((value): value is string => Boolean(value))
    .join(", ") || "Your pet";
  const packages = Array.from(new Set((appointment.appointment_pets ?? [])
    .map((row) => row.packages?.name?.trim())
    .filter((value): value is string => Boolean(value))));

  const configuredLogoUrl = process.env.HAPPYTAILS_EMAIL_LOGO_URL?.trim() || "";
  // Only use hosted HTTPS images. Email clients cannot load localhost or relative paths.
  const logoUrl = /^https:\/\/[^\s]+$/i.test(configuredLogoUrl) ? configuredLogoUrl : "";
  const supportEmail = process.env.HAPPYTAILS_SUPPORT_EMAIL?.trim() || process.env.GMAIL_SMTP_USER || "";
  const supportPhone = process.env.HAPPYTAILS_SUPPORT_PHONE?.trim() || "";
  const contactLine = [supportEmail, supportPhone].filter(Boolean).join(" • ");
  const detailRows: Array<[string, string]> = [
    ["Appointment Reference", reference],
    ["Service", serviceLabel(appointment.service_type)],
    ["Pet(s)", pets],
    ...(packages.length ? [["Selected Package(s)", packages.join(", ")]] as Array<[string, string]> : []),
    ["Scheduled Date", formatDate(appointment.scheduled_date)],
  ];

  if (appointment.service_type === "boarding") {
    detailRows.push(["Drop-off", formatDateTime(appointment.drop_off_at)]);
    detailRows.push(["Pick-up", formatDateTime(appointment.pick_up_at)]);
  } else {
    detailRows.push(["Scheduled Time", formatTime(appointment.scheduled_time)]);
  }

  if (action === "cancelled") {
    detailRows.push(["Cancellation Reason", reason?.trim() || "Please contact HappyTails for more information."]);
  }

  const rowsHtml = detailRows.map(([label, value], index) => `
    <tr>
      <td style="padding:14px 16px;border-bottom:${index === detailRows.length - 1 ? "0" : `1px solid ${THEME.border}`};color:${THEME.muted};font-size:13px;font-weight:600;vertical-align:top;width:38%">${escapeHtml(label)}</td>
      <td style="padding:14px 16px;border-bottom:${index === detailRows.length - 1 ? "0" : `1px solid ${THEME.border}`};color:${THEME.text};font-size:14px;font-weight:700;line-height:1.5;vertical-align:top;overflow-wrap:anywhere">${escapeHtml(value)}</td>
    </tr>`).join("");

  const subject = `HappyTails | ${content.heading} | ${reference}`;
  const html = `<!doctype html>
<html>
  <body style="margin:0;background:${THEME.blush};padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:${THEME.text}">
    <div style="max-width:680px;margin:0 auto;background:${THEME.surface};border:1px solid ${THEME.border};border-radius:24px;overflow:hidden;box-shadow:0 16px 40px rgba(20,40,62,.08)">
      <div style="background:${THEME.surface};padding:24px 26px;border-bottom:3px solid ${THEME.pink}">
        <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%">
          <tr>
            <td style="width:78px;vertical-align:middle;padding-right:16px">
              ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" width="68" alt="HappyTails logo" style="width:68px;max-height:76px;object-fit:contain;display:block;border:0" />` : `<span style="display:block;font-weight:800;color:${THEME.pink};font-size:20px">HT</span>`}
            </td>
            <td style="vertical-align:middle">
              <div style="color:${THEME.pink};font-weight:800;font-size:15px;letter-spacing:.2px">HappyTails Pet Grooming Café</div>
              <h1 style="font-size:25px;line-height:1.3;color:${THEME.navy};margin:7px 0 10px;font-weight:800">${escapeHtml(content.heading)}</h1>
              <span style="display:inline-block;background:${content.badgeBg};color:${content.badgeColor};padding:5px 10px;border-radius:6px;font-size:11px;font-weight:700">${escapeHtml(content.bannerLabel)}</span>
            </td>
          </tr>
        </table>
      </div>

      <div style="padding:30px 26px 10px 26px">
        <p style="margin:0 0 14px 0;font-size:15px;line-height:1.8">Hello <strong>${escapeHtml(appointment.owner_name)}</strong>,</p>
        <p style="margin:0 0 20px 0;font-size:15px;line-height:1.8;color:${THEME.text}">${escapeHtml(content.intro)}</p>

        <div style="border:1px solid ${THEME.border};border-radius:18px;overflow:hidden;background:${THEME.surface}">
          <div style="padding:16px 18px;background:${THEME.footer};border-bottom:1px solid ${THEME.border};font-size:14px;font-weight:800;color:${THEME.navy}">Appointment Details</div>
          <table role="presentation" style="width:100%;border-collapse:collapse">${rowsHtml}
          </table>
        </div>

        <div style="padding:20px 2px 10px 2px">
          <p style="margin:0 0 14px 0;font-size:14px;line-height:1.8;color:${THEME.text}">${escapeHtml(content.closing)}</p>
          <p style="margin:0 0 8px 0;font-size:14px;line-height:1.8">Warm regards,<br /><strong>The HappyTails Team</strong></p>
        </div>
      </div>

      <div style="padding:18px 26px;background:${THEME.footer};border-top:1px solid ${THEME.border};font-size:12px;line-height:1.7;color:${THEME.muted}">
        <div style="font-weight:700;color:${THEME.navy};margin-bottom:4px">HappyTails Pet Grooming Café</div>
        ${contactLine ? `<div style="margin-bottom:4px">${escapeHtml(contactLine)}</div>` : ""}
        <div>This is an automated appointment update from HappyTails. Please do not reply directly unless your sending mailbox is monitored.</div>
        <div style="margin-top:6px">Appointment ID (for support): ${escapeHtml(appointment.id)}</div>
      </div>
    </div>
  </body>
</html>`;

  const text = [
    `${content.heading}`,
    `Hello ${appointment.owner_name},`,
    content.intro,
    "",
    `Appointment Reference: ${reference}`,
    `Service: ${serviceLabel(appointment.service_type)}`,
    `Pet(s): ${pets}`,
    ...(packages.length ? [`Selected Package(s): ${packages.join(", ")}`] : []),
    `Scheduled Date: ${formatDate(appointment.scheduled_date)}`,
    appointment.service_type === "boarding"
      ? `Drop-off: ${formatDateTime(appointment.drop_off_at)}`
      : `Scheduled Time: ${formatTime(appointment.scheduled_time)}`,
    ...(appointment.service_type === "boarding" ? [`Pick-up: ${formatDateTime(appointment.pick_up_at)}`] : []),
    ...(action === "cancelled" ? [`Cancellation Reason: ${reason?.trim() || "Please contact HappyTails for more information."}`] : []),
    "",
    content.closing,
    "",
    "HappyTails Pet Grooming Café",
    ...(contactLine ? [contactLine] : []),
    `Internal Appointment ID: ${appointment.id}`,
  ].join("\n");

  return { subject, html, text, reference };
}
