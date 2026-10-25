"use client";

// POS and Customer Booking use the same live-capacity, closure-aware calendar.
// Avoid rendering two nested calendar pickers with conflicting selections.
export { default } from "@/components/dashboard/booking/OnlineCapacityGroomingSchedule";
