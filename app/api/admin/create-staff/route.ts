// POST /api/admin/create-staff
// Superadmin-only. Staff members always receive role='admin'; job titles
// are cosmetic labels and do not change permissions.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validatePassword, validateEmail, validatePhoneNumber, validateUsername } from "@/lib/validation/staff";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const actor = auth.user;

  if (authError || !actor) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const [{ data: actorProfile, error: profileError }, { data: staffRow, error: staffError }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", actor.id).maybeSingle(),
    supabase.from("staff_profiles").select("status").eq("id", actor.id).maybeSingle(),
  ]);

  if (profileError || staffError || !actorProfile || !staffRow) {
    return NextResponse.json({ error: "Account access could not be verified." }, { status: 403 });
  }
  if (actorProfile.role !== "superadmin" || staffRow.status !== "active") {
    return NextResponse.json({ error: "Only an active superadmin can create staff accounts." }, { status: 403 });
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

  const normalizedUsername = username.trim();
  const safePattern = normalizedUsername.replace(/[\\%_]/g, "\\$&");
  const { data: possibleStaff, error: usernameLookupError } = await adminClient
    .from("staff_profiles")
    .select("username")
    .ilike("username", safePattern)
    .limit(20);
  if (usernameLookupError) {
    return NextResponse.json({ error: "Could not validate the staff username." }, { status: 503 });
  }
  if ((possibleStaff ?? []).some((row) =>
    row.username?.toLowerCase() === normalizedUsername.toLowerCase()
  )) {
    return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
  }
  // Customer and staff identifiers share one login field. Avoid creating
  // duplicate usernames between the two account types.
  const { data: customerUsernameTaken, error: customerLookupError } = await adminClient
    .rpc("is_username_taken", { check_username: normalizedUsername });
  if (customerLookupError) {
    return NextResponse.json({ error: "Could not check customer username collisions." }, { status: 503 });
  }
  if (customerUsernameTaken) {
    return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
  }

  // Validate role configuration BEFORE creating an Auth user.
  const { data: adminRole, error: roleLookupError } = await adminClient
    .from("roles")
    .select("id")
    .eq("name", "admin")
    .maybeSingle();
  if (roleLookupError || !adminRole) {
    return NextResponse.json({ error: "Staff role is not configured in Supabase." }, { status: 503 });
  }

  const { data: existingUsers, error: existingUsersError } = await adminClient.auth.admin.listUsers();
  if (existingUsersError || !existingUsers) {
    return NextResponse.json({ error: "Could not verify email availability." }, { status: 503 });
  }
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

  // The earlier code ignored the profile update result. An UPDATE that
  // affects zero rows returns no error, leaving a staff Auth user with a
  // missing or incorrect role. Verify the result and fail the creation.
  const { data: assignedProfile, error: assignmentError } = await adminClient
    .from("profiles")
    .update({ role: "admin", role_id: adminRole.id })
    .eq("id", newUser.user.id)
    .select("id, role")
    .maybeSingle();
  if (assignmentError || !assignedProfile || assignedProfile.role !== "admin") {
    await adminClient.auth.admin.deleteUser(newUser.user.id);
    console.error("Staff profile role assignment failed", assignmentError?.code ?? "missing_profile");
    return NextResponse.json({ error: "Could not assign the staff role. No staff account was created." }, { status: 500 });
  }

  const { data: staffProfile, error: staffErrorOnCreate } = await adminClient
    .from("staff_profiles")
    .insert({
      id: newUser.user.id,
      first_name: firstName,
      middle_name: middleName || null,
      last_name: lastName,
      username: normalizedUsername,
      email: email.trim(),
      phone_number: phoneNumber || null,
      job_title: jobTitle || "Staff",
      role_id: adminRole.id,
      status: "active",
    })
    .select()
    .single();

  if (staffErrorOnCreate) {
    await adminClient.auth.admin.deleteUser(newUser.user.id);
    return NextResponse.json({ error: `Failed to create staff profile: ${staffErrorOnCreate.message}` }, { status: 500 });
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
