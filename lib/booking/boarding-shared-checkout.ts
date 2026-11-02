import type { CreateAppointmentInput } from "@/lib/supabase/appointments";
import { validShareGroup, type ShareSelection } from "@/lib/booking/boarding-share";

type Prepared = { inputs: CreateAppointmentInput[]; inputToSaved: number[]; error: string | null };

/** The original summary passes one boarding appointment PER pet. Convert explicitly
 * selected same-stay sharing groups to ONE appointment with multiple pet rows.
 * This is a real shared kennel + single appointment/total, not a visual discount.
 */
export function prepareBoardingShares(inputs: CreateAppointmentInput[]): Prepared {
  const groups = new Map<string, number[]>();
  const mapped: number[] = [];
  const output: CreateAppointmentInput[] = [];
  for (let i = 0; i < inputs.length; i++) {
    const entry = inputs[i];
    const sel = entry.petSelections[0] as ShareSelection | undefined;
    const id = entry.service_type === "boarding" && entry.petSelections.length === 1 ? sel?.boardingShareGroupId : null;
    if (id) groups.set(id, [...(groups.get(id) ?? []), i]);
  }
  for (const [id, indices] of groups) {
    const first = inputs[indices[0]];
    const selections = indices.map(i => inputs[i].petSelections[0] as ShareSelection);
    const matched = selections.every(s => s.boardingShareGroupId === id);
    const sameAppointment = indices.every(i => {
      const item = inputs[i];
      return item.service_type === "boarding" && item.is_walk_in === first.is_walk_in &&
        item.customer_id === first.customer_id && item.owner_name === first.owner_name &&
        item.owner_contact === first.owner_contact && item.scheduled_date === first.scheduled_date &&
        item.drop_off_at === first.drop_off_at && item.pick_up_at === first.pick_up_at &&
        item.special_requests === first.special_requests;
    });
    if (!matched || !sameAppointment || !validShareGroup(selections) ||
      new Set(selections.map(s=>s.pet.id)).size !== selections.length) {
      return { inputs, inputToSaved: [], error: "Shared pets must have an allowed combination, the same Big-kennel package, stay duration, owner and schedule." };
    }
  }
  const preparedGroups = new Map<string, number>();
  for (let i = 0; i < inputs.length; i++) {
    const entry = inputs[i];
    const sel = entry.petSelections[0] as ShareSelection | undefined;
    const groupId = entry.service_type === "boarding" && entry.petSelections.length === 1 ? sel?.boardingShareGroupId : null;
    if (groupId) {
      let saved = preparedGroups.get(groupId);
      if (saved === undefined) {
        saved = output.length;
        const originalIndices = groups.get(groupId)!;
        output.push({ ...entry, petSelections: originalIndices.map(index => inputs[index].petSelections[0]) });
        preparedGroups.set(groupId, saved);
      }
      mapped.push(saved);
    } else {
      mapped.push(output.length);
      output.push(entry);
    }
  }
  return { inputs: output, inputToSaved: mapped, error: null };
}
