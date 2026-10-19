import type { ReactNode } from "react";
import CustomerHolidayCalendarGuard from "@/components/dashboard/booking/CustomerHolidayCalendarGuard";
import "./booking-polish.css";
export default function BookingLayout({ children }: { children: ReactNode }) {
  return <section className="ht-booking-v4"><CustomerHolidayCalendarGuard>{children}</CustomerHolidayCalendarGuard></section>;
}
