"use client";
import BoardingAvailabilitySchedule, { type BoardingScheduleProps } from "@/components/shared/BoardingAvailabilitySchedule";
export default function CustomerBoardingScheduleStep(props: BoardingScheduleProps) {
  return <BoardingAvailabilitySchedule {...props} />;
}
