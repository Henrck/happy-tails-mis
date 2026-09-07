export type OwnProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  phone_number: string | null;
  profile_picture_url: string | null;
  role: string;
  created_at: string;
  email: string; // from auth.users, not profiles
  employee_id: string | null;
  date_of_birth: string | null;
  address: string | null;
  recovery_email: string | null;
  password_changed_at: string | null;
};

// Split full_name into first/middle/last for the form — stored as one
// string in the database (full_name), same as everywhere else in the
// app, but the reference shows 3 separate input fields.
export function splitFullName(fullName: string | null): { first: string; middle: string; last: string } {
  const parts = (fullName ?? "").trim().split(/\s+/);
  if (parts.length <= 1) return { first: parts[0] ?? "", middle: "", last: "" };
  if (parts.length === 2) return { first: parts[0], middle: "", last: parts[1] };
  return { first: parts[0], middle: parts.slice(1, -1).join(" "), last: parts[parts.length - 1] };
}
