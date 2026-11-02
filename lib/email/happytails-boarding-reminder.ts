import { displayAppointmentReference } from "@/lib/email/happytails-appointment-email";

type Reminder = { appointmentId: string; customerName: string; petName: string; pickupAt: string; scheduledDate: string };
const escapeHtml = (x: string) => x.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));

export function boardingReminderEmail(data: Reminder) {
  const reference = displayAppointmentReference(data.appointmentId,"boarding",data.scheduledDate);
  const date = new Date(data.pickupAt).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "full", timeStyle: "short" });
  const configuredLogo = process.env.HAPPYTAILS_EMAIL_LOGO_URL?.trim() ?? "";
  const logo = /^https:\/\/[^\s"<>]+$/i.test(configuredLogo)
    ? `<img src="${escapeHtml(configuredLogo)}" width="70" alt="HappyTails" style="display:block;border:0;width:70px;height:auto" />`
    : `<strong style="font-size:22px;color:#F53D93">HappyTails</strong>`;
  const subject = `HappyTails | Boarding Pickup Reminder | ${reference}`;
  const text = `Hello ${data.customerName},\n\nThis is a friendly reminder that ${data.petName}'s boarding stay is scheduled to end tomorrow.\n\nAppointment Reference: ${reference}\nPet: ${data.petName}\nScheduled pickup: ${date} (Philippine time)\n\nPlease plan to arrive at the scheduled pickup time. If you need assistance or foresee a delay, contact HappyTails in advance.\n\nThank you for choosing HappyTails Pet Grooming Café.`;
  const html = `<!doctype html><html><body style="margin:0;padding:24px 12px;background:#FDF1F7;font-family:Arial,Helvetica,sans-serif;color:#25364a">
<table role="presentation" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;margin:auto;border:1px solid #f3d4e4;border-radius:18px;background:#fff;overflow:hidden">
<tr><td style="padding:24px;border-bottom:3px solid #F53D93"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="padding-right:18px;vertical-align:middle">${logo}</td><td style="vertical-align:middle"><strong style="font-size:15px;color:#F53D93">HappyTails Pet Grooming Café</strong><h1 style="margin:7px 0;font-size:24px;color:#14283e">Boarding Pickup Reminder</h1><span style="font-size:12px;font-weight:bold;color:#a04b04;background:#fef3c7;padding:5px 9px;border-radius:5px">Pickup Tomorrow</span></td></tr></table></td></tr>
<tr><td style="padding:26px"><p>Hello <strong>${escapeHtml(data.customerName)}</strong>,</p><p style="line-height:1.8">This is a friendly reminder that <strong>${escapeHtml(data.petName)}</strong>'s boarding stay is scheduled to end tomorrow.</p>
<table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #f3d4e4"><tr style="background:#f8fafc"><th colspan="2" style="text-align:left;padding:13px;color:#14283e">Pickup Details</th></tr><tr><td style="padding:12px;border-top:1px solid #f3d4e4;color:#667085">Appointment Reference</td><td style="padding:12px;border-top:1px solid #f3d4e4;font-weight:700">${escapeHtml(reference)}</td></tr><tr><td style="padding:12px;border-top:1px solid #f3d4e4;color:#667085">Pet</td><td style="padding:12px;border-top:1px solid #f3d4e4;font-weight:700">${escapeHtml(data.petName)}</td></tr><tr><td style="padding:12px;border-top:1px solid #f3d4e4;color:#667085">Pickup Schedule</td><td style="padding:12px;border-top:1px solid #f3d4e4;font-weight:700">${escapeHtml(date)} (PHT)</td></tr></table>
<p style="line-height:1.8;margin-top:22px">Please plan to arrive at your scheduled pickup time. If you anticipate a delay, kindly contact HappyTails in advance.</p><p>Warm regards,<br /><strong>The HappyTails Team</strong></p></td></tr>
<tr><td style="padding:18px 26px;background:#f8fafc;color:#667085;font-size:12px">This is an automated pickup reminder from HappyTails Pet Grooming Café.</td></tr></table></body></html>`;
  return { subject, text, html };
}
