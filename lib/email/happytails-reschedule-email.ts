import { displayAppointmentReference } from "@/lib/email/happytails-appointment-email";

export type RescheduleEmailDetails = {
  id: string;
  ownerName: string;
  serviceType: string;
  petNames: string[];
  reason: string;
  oldDate: string | null;
  oldTime: string | null;
  oldDropOff: string | null;
  oldPickUp: string | null;
  newDate: string;
  newTime: string | null;
  newDropOff: string | null;
  newPickUp: string | null;
};

const labels: Record<string, string> = {
  dog_grooming: "Dog Grooming", cat_grooming: "Cat Grooming", boarding: "Boarding", ala_carte: "À La Carte",
};
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
function dateLabel(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(`${value}T12:00:00+08:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-PH", { timeZone: "Asia/Manila", dateStyle: "long" });
}
function timeLabel(value: string | null) {
  if (!value) return "Not recorded";
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return value;
  const hours = Number(match[1]);
  return `${hours % 12 || 12}:${match[2]} ${hours < 12 ? "AM" : "PM"}`;
}
function dateTimeLabel(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "long", timeStyle: "short" });
}
export function buildRescheduleEmail(d: RescheduleEmailDetails) {
  const boarding = d.serviceType === "boarding";
  const ref = displayAppointmentReference(d.id, d.serviceType, d.newDate);
  const old = boarding
    ? `Drop-off: ${dateTimeLabel(d.oldDropOff)}\nPick-up: ${dateTimeLabel(d.oldPickUp)}`
    : `${dateLabel(d.oldDate)} · ${timeLabel(d.oldTime)}`;
  const updated = boarding
    ? `Drop-off: ${dateTimeLabel(d.newDropOff)}\nPick-up: ${dateTimeLabel(d.newPickUp)}`
    : `${dateLabel(d.newDate)} · ${timeLabel(d.newTime)}`;
  const subject = `HappyTails | Appointment Rescheduled | ${ref}`;
  const text = [
    "HappyTails Pet Grooming Café — Appointment Rescheduled", "", `Hello ${d.ownerName},`,
    "Our team has updated your appointment schedule. Please review the changes below.", "",
    `Appointment Reference: ${ref}`, `Service: ${labels[d.serviceType] ?? "Pet Service"}`,
    `Pet(s): ${d.petNames.join(", ") || "Your pet"}`, "", "Previous schedule:", old,
    "", "New schedule:", updated, "", `Reason for rescheduling: ${d.reason}`, "",
    "If the new schedule does not work for you, please contact HappyTails.",
    "", "Warm regards,", "The HappyTails Team",
  ].join("\n");
  const logo = process.env.HAPPYTAILS_EMAIL_LOGO_URL?.trim() ?? "";
  const image = /^https:\/\/[^\s]+$/i.test(logo) ? `<img src="${escapeHtml(logo)}" width="64" alt="HappyTails" style="max-height:68px;object-fit:contain;vertical-align:middle;margin-right:12px" />` : "";
  const scheduleHtml = (value: string) => escapeHtml(value).replace(/\n/g, "<br />");
  const html = `<!doctype html><html><body style="margin:0;padding:24px 12px;background:#fdf1f7;font-family:Arial,Helvetica,sans-serif;color:#25364a">
    <div style="max-width:660px;margin:auto;background:#fff;border:1px solid #f3d4e4;border-radius:20px;overflow:hidden">
      <div style="padding:24px;border-bottom:3px solid #f53d93">${image}<strong style="color:#f53d93;font-size:19px">HappyTails Pet Grooming Café</strong><h1 style="margin:18px 0 0;color:#14283e;font-size:25px">Appointment Rescheduled</h1></div>
      <div style="padding:26px;font-size:14px;line-height:1.7"><p>Hello <strong>${escapeHtml(d.ownerName)}</strong>,</p><p>Our team has updated your appointment schedule. Please review the changes below.</p>
      <p><strong>Reference:</strong> ${escapeHtml(ref)}<br /><strong>Service:</strong> ${escapeHtml(labels[d.serviceType] ?? "Pet Service")}<br /><strong>Pet(s):</strong> ${escapeHtml(d.petNames.join(", ") || "Your pet")}</p>
      <div style="border:1px solid #f3d4e4;border-radius:12px;padding:15px;margin:16px 0"><strong>Previous schedule</strong><p style="margin:6px 0 0">${scheduleHtml(old)}</p></div>
      <div style="border:1px solid #f3d4e4;background:#fdf1f7;border-radius:12px;padding:15px;margin:16px 0"><strong>New schedule</strong><p style="margin:6px 0 0">${scheduleHtml(updated)}</p></div>
      <div style="border-left:4px solid #f53d93;padding:8px 12px;background:#fafafa"><strong>Reason for rescheduling</strong><p style="margin:5px 0 0;white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(d.reason)}</p></div>
      <p>If the new schedule does not work for you, please contact HappyTails.</p><p>Warm regards,<br /><strong>The HappyTails Team</strong></p></div>
      <div style="padding:16px 24px;background:#f8fafc;color:#667085;font-size:12px">Automated appointment update from HappyTails. Appointment ID: ${escapeHtml(d.id)}</div>
    </div></body></html>`;
  return { subject, text, html };
}
