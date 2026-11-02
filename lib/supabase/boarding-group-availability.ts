import { createClient } from "@/lib/supabase/client";

export type BoardingGroupPet = {
  pet_id: string;
  kennel_size: "small" | "big";
  nights: number;
  share_group?: string | null;
};
export type BoardingGroupDay = {
  day: string;
  available: boolean;
  reason: string | null;
};

function validPets(pets: BoardingGroupPet[]): boolean {
  return pets.length >= 1 && pets.length <= 30 &&
    new Set(pets.map((pet) => pet.pet_id)).size === pets.length &&
    pets.every((pet) => /^[a-f\d-]{36}$/i.test(pet.pet_id) &&
      (pet.kennel_size === "small" || pet.kennel_size === "big") &&
      Number.isSafeInteger(pet.nights) && pet.nights >= 1 && pet.nights <= 365);
}

export async function checkBoardingGroup(date: string, time: string, pets: BoardingGroupPet[]): Promise<{
  available: boolean; reason: string | null;
}> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || !validPets(pets)) {
    return { available: false, reason: "Please review the selected pets, stay durations, date, and arrival time." };
  }
  const { data, error } = await createClient().rpc("happytails_boarding_group_plan", {
    p_date: date, p_time: time, p_pets: pets,
  });
  if (error) return { available: false, reason: error.message };
  if (!data || typeof data !== "object" || typeof data.available !== "boolean") {
    return { available: false, reason: "Unable to verify shared kennel capacity." };
  }
  return { available: data.available, reason: typeof data.reason === "string" ? data.reason : null };
}

export async function fetchBoardingGroupMonth(month: string, time: string, pets: BoardingGroupPet[]): Promise<{
  days: BoardingGroupDay[]; error: string | null;
}> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !/^\d{2}:\d{2}$/.test(time) || !validPets(pets)) {
    return { days: [], error: "Please complete the kennel and duration for each pet." };
  }
  const { data, error } = await createClient().rpc("happytails_boarding_group_month", {
    p_month: `${month}-01`, p_time: time, p_pets: pets,
  });
  if (error) return { days: [], error: error.message };
  if (!Array.isArray(data) || data.length < 28 || data.length > 31 || data.some((row) =>
    !/^\d{4}-\d{2}-\d{2}$/.test(row.day) || typeof row.available !== "boolean")) {
    return { days: [], error: "Boarding group availability response was incomplete." };
  }
  return { days: data.map((row) => ({
    day: String(row.day), available: row.available,
    reason: typeof row.reason === "string" ? row.reason : null,
  })), error: null };
}
