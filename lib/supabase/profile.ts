// Query + mutation helpers for the logged-in user's OWN profile.
import { createClient } from "./client";
import type { OwnProfile } from "@/lib/types/profile";

export async function fetchOwnProfile(): Promise<{ profile: OwnProfile | null; error: string | null }> {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { profile: null, error: authError?.message ?? "Not signed in." };

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, phone_number, profile_picture_url, role, created_at, employee_id, date_of_birth, address, recovery_email, password_changed_at")
    .eq("id", user.id)
    .single();

  if (error || !data) return { profile: null, error: error?.message ?? "Profile not found." };

  return { profile: { ...data, email: user.email ?? "" }, error: null };
}

export async function updateOwnProfile(fields: {
  fullName: string;
  phoneNumber: string;
  email: string;
  dateOfBirth: string | null;
  address: string;
  recoveryEmail: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: fields.fullName,
      phone_number: fields.phoneNumber,
      date_of_birth: fields.dateOfBirth,
      address: fields.address,
      recovery_email: fields.recoveryEmail || null,
    })
    .eq("id", user.id);
  if (profileError) return { error: profileError.message };

  if (fields.email !== user.email) {
    const { error: emailError } = await supabase.auth.updateUser({ email: fields.email });
    if (emailError) return { error: emailError.message };
    return { error: null, emailChangePending: true };
  }

  return { error: null, emailChangePending: false };
}

export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Not signed in." };

  // Verify the current password is actually correct before allowing a
  // change — re-authenticating with it is how Supabase confirms this,
  // since there's no separate "check password" endpoint. If this fails,
  // the current password was wrong.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) return { error: "Current password is incorrect." };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };

  await supabase.from("profiles").update({ password_changed_at: new Date().toISOString() }).eq("id", user.id);
  return { error: null };
}

export async function uploadAvatar(file: File) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", url: null };

  // Reusing the existing "site-images" bucket under an avatars/ prefix,
  // rather than provisioning a whole separate bucket + policy set just
  // for this one feature. A dedicated "avatars" bucket would be cleaner
  // long-term (different access patterns, different lifecycle than
  // marketing images) — flagging this as a shortcut, not pretending it's
  // the ideal final structure.
  const ext = file.name.split(".").pop();
  const path = `avatars/${user.id}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("site-images").upload(path, file, { upsert: true });
  if (uploadError) return { error: uploadError.message, url: null };

  const { data } = supabase.storage.from("site-images").getPublicUrl(path);
  const { error: updateError } = await supabase.from("profiles").update({ profile_picture_url: data.publicUrl }).eq("id", user.id);
  if (updateError) return { error: updateError.message, url: null };

  return { error: null, url: data.publicUrl };
}
