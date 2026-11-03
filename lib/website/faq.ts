// A single website_text row stores the ordered FAQ collection.
// Shared by the public homepage and Website Management preview/editor.
export const FAQ_TEXT_KEY = "faq_items";
export type FAQItem = { id: string; question: string; answer: string; published: boolean };

export const defaultFAQs: FAQItem[] = [
  { id: "faq-book", question: "How do I book an appointment?", answer: "Sign in to your HappyTails account, open Book Appointment, select your pet and service, then choose an available schedule. Review your details before confirming the booking.", published: true },
  { id: "faq-multiple", question: "Can I book services for more than one pet?", answer: "Yes. You can select multiple registered pets and choose eligible services for them. Boarding availability and kennel-sharing rules depend on your pets' sizes and the selected dates.", published: true },
  { id: "faq-weight", question: "What if I don't know my pet's weight or size?", answer: "You can register your pet without a weight. The pet may remain unclassified until its weight is recorded. Grooming sizes and prices may be verified when your pet arrives at the shop.", published: true },
  { id: "faq-price", question: "Is the grooming price shown during booking final?", answer: "Grooming prices shown online are estimates based on the selected service and pet size. If the measured weight changes the applicable rate, staff will explain the revised price and request your approval.", published: true },
  { id: "faq-availability", question: "Why is my preferred appointment time unavailable?", answer: "Some dates or time slots may be fully booked, unavailable due to groomer or kennel capacity, or closed for scheduling. Choose another available date or time shown in the booking calendar.", published: true },
  { id: "faq-vaccine", question: "What if I'm unsure whether my pet is vaccinated?", answer: "Choose Not sure when registering or editing your pet's vaccination status. This is a record of the information you provided, not confirmation that your pet meets any service-specific health requirements. Contact the shop before your visit if you need clarification.", published: true },
  { id: "faq-reschedule", question: "Can I reschedule an existing appointment?", answer: "Open My Appointments to check whether your booking can be rescheduled. Available new dates and times are shown in the rescheduling calendar. If you cannot make a change online, contact the shop for assistance.", published: true },
  { id: "faq-boarding", question: "Can my pets stay together in one boarding kennel?", answer: "Eligible pets may share a kennel when the chosen combination fits HappyTails' boarding capacity rules and their stay dates match. The booking system will indicate when a separate appointment or kennel is needed.", published: true },
];

export function parseFAQs(raw: string | null | undefined): FAQItem[] {
  if (raw == null) return defaultFAQs.map(item => ({ ...item }));
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.slice(0, 60).filter((entry): entry is FAQItem =>
      !!entry && typeof entry === "object" &&
      typeof entry.id === "string" && typeof entry.question === "string" &&
      typeof entry.answer === "string" && typeof entry.published === "boolean"
    ).map(item => ({ id: item.id, question: item.question, answer: item.answer, published: item.published }));
  } catch { return []; }
}

export function isValidFAQJson(raw: string): boolean {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) && value.every(item => !!item && typeof item === "object" &&
      typeof item.id === "string" && typeof item.question === "string" &&
      typeof item.answer === "string" && typeof item.published === "boolean");
  } catch { return false; }
}
