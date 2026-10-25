"use client";
import BoardingAvailabilitySchedule, { type BoardingScheduleProps } from "@/components/shared/BoardingAvailabilitySchedule";
export default function BoardingScheduleStep(props: BoardingScheduleProps) {
  return <BoardingAvailabilitySchedule {...props} />;
}
