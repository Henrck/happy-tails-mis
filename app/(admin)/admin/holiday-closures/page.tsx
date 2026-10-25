import { redirect } from "next/navigation";

// Keep old navigation/bookmarks working while centralizing the calendar controls.
export default function HolidayClosuresPage() {
  redirect("/admin/calendar-management");
}
