// POST /api/admin/create-staff
//
// Superadmin-exclusive, as established. The only change from before:
// created accounts get role = 'admin' (not 'staff' — that role no
// longer exists). "job_title" is still a free-text cosmetic label
// (e.g. "Admin", "Groomer", "Front Desk") with zero effect on
// permissions — every account created here has the exact same access
// level underneath, no matter what title you give them.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validatePassword, validateEmail, validatePhoneNumber, validateUsername } from "@/lib/validation/staff";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user: actor } } = await supabase.auth.getUser();

  if (!actor) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: actorProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", actor.id)
    .single();

  if (!actorProfile || actorProfile.role !== "superadmin") {
    return NextResponse.json({ error: "Only the superadmin can create staff accounts." }, { status: 403 });
  }

  const body = await request.json();
  const { firstName, middleName, lastName, username, password, confirmPassword, email, phoneNumber, jobTitle } = body;

  if (!firstName?.trim() || !lastName?.trim() || !username?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: "Please fill in all required fields." }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  const passwordError = validatePassword(password);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

  const emailError = validateEmail(email);
  if (emailError) return NextResponse.json({ error: emailError }, { status: 400 });

  const usernameError = validateUsername(username);
  if (usernameError) return NextResponse.json({ error: usernameError }, { status: 400 });

  if (phoneNumber) {
    const phoneError = validatePhoneNumber(phoneNumber);
    if (phoneError) return NextResponse.json({ error: phoneError }, { status: 400 });
  }

  const adminClient = createAdminClient();

  const { data: existingUsername } = await adminClient
    .from("staff_profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (existingUsername) {
    return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
  }

  const { data: existingUsers } = await adminClient.auth.admin.listUsers();
  if (existingUsers.users.some((u) => u.email?.toLowerCase() === email.toLowerCase())) {
    return NextResponse.json({ error: "That email is already registered." }, { status: 409 });
  }

  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `${firstName} ${lastName}` },
  });

  if (createError || !newUser.user) {
    return NextResponse.json({ error: createError?.message ?? "Failed to create account." }, { status: 500 });
  }

  // CHANGED: 'admin', not 'staff' — that role no longer exists. Still
  // hardcoded, still not accepted as a request parameter — no way to
  // smuggle in 'superadmin' here.
  const { data: adminRole } = await adminClient.from("roles").select("id").eq("name", "admin").single();

  await adminClient.from("profiles").update({ role: "admin", role_id: adminRole?.id }).eq("id", newUser.user.id);

  const { data: staffProfile, error: staffError } = await adminClient
    .from("staff_profiles")
    .insert({
      id: newUser.user.id,
      first_name: firstName,
      middle_name: middleName || null,
      last_name: lastName,
      username,
      phone_number: phoneNumber || null,
      job_title: jobTitle || "Staff",
      role_id: adminRole?.id,
      status: "active",
    })
    .select()
    .single();

  if (staffError) {
    await adminClient.auth.admin.deleteUser(newUser.user.id);
    return NextResponse.json({ error: `Failed to create staff profile: ${staffError.message}` }, { status: 500 });
  }

  await adminClient.from("audit_logs").insert({
    actor_id: actor.id,
    actor_role: actorProfile.role,
    action: "staff.created",
    target_type: "staff",
    target_id: newUser.user.id,
    details: { username, jobTitle: jobTitle || "Staff" },
  });

  return NextResponse.json({ staff: staffProfile }, { status: 201 });
}
