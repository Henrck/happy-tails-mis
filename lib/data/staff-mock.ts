// Lightweight staff list — grooming sessions still reference a groomer by
// name string (see grooming-sessions-mock.ts), not a staff ID yet. This
// list exists to power the Add/Archive Staff UI now; reconciling it into
// a real foreign-key relationship happens once real Supabase tables exist.
export type Staff = {
  id: string;
  name: string;
  archived: boolean;
};

export const staff: Staff[] = [
  { id: "st-1", name: "Francis Gomez", archived: false },
  { id: "st-2", name: "Lawrence Pinili", archived: false },
];
