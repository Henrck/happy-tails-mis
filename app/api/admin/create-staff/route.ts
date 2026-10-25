// POST /api/admin/create-staff
// Only active Superadmin may create staff identities. Staff use a username
// and password; a private, random Auth email is generated for Supabase's
// email/password identity provider. It is NOT a deliverable mailbox.
// Never write a newly created staff identity to public.customers.
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validatePassword, validatePhoneNumber, validateUsername } from "@/lib/validation/staff";

export const runtime = "nodejs";

type StaffRequest = {
  firstName?: unknown;
  middleName?: unknown;
  lastName?: unknown;
  username?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
  phoneNumber?: unknown;
  jobTitle?: unknown;
};

function badRequest(error: string, status = 400) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

const asText = (value: unknown): string => typeof value === "string" ? value.trim() : "";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const actor = auth.user;
  if (authError || !actor) return badRequest("Not signed in.", 401);

  const [{ data: actorProfile, error: profileError }, { data: actorStaff, error: staffError }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", actor.id).maybeSingle(),
    supabase.from("staff_profiles").select("status").eq("id", actor.id).maybeSingle(),
  ]);
  if (profileError || staffError || !actorProfile || !actorStaff ||
      actorProfile.role !== "superadmin" || actorStaff.status !== "active") {
    return badRequest("Only an active Superadmin may create staff accounts.", 403);
  }

  let body: StaffRequest;
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) return badRequest("Expected JSON request.");
    // Avoid accepting oversized provisioning requests.
    const raw = await request.text();
    if (raw.length > 8192) return badRequest("Request is too large.", 413);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return badRequest("Invalid account details.");
    body = parsed as StaffRequest;
  } catch {
    return badRequest("Invalid JSON request.");
  }

  const firstName = asText(body.firstName);
  const middleName = asText(body.middleName);
  const lastName = asText(body.lastName);
  const username = asText(body.username);
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  const phoneNumber = asText(body.phoneNumber);
  const jobTitle = asText(body.jobTitle) || "Staff";

  if (!firstName || !lastName || !username || !password) {
    return badRequest("First name, last name, username, and password are required.");
  }
  if ([firstName, middleName, lastName].some(value => value.length > 80) || jobTitle.length > 100) {
    return badRequest("One or more name or job title fields are too long.");
  }
  if (username.length > 20) return badRequest("Username must not exceed 20 characters.");
  const usernameError = validateUsername(username);
  if (usernameError) return badRequest(usernameError);
  if (password !== confirmPassword) return badRequest("Passwords do not match.");
  if (password.length > 1024) return badRequest("Password is too long.");
  const passwordError = validatePassword(password);
  if (passwordError) return badRequest(passwordError);
  if (phoneNumber) {
    const phoneError = validatePhoneNumber(phoneNumber);
    if (phoneError) return badRequest(phoneError);
  }

  const adminClient = createAdminClient();
  const escaped = username.replace(/[\\%_]/g, "\\$&");
  const { data: possibleStaff, error: lookupError } = await adminClient
    .from("staff_profiles").select("username").ilike("username", escaped).limit(20);
  if (lookupError) return badRequest("Could not validate the staff username.", 503);
  if ((possibleStaff ?? []).some(row => row.username?.toLowerCase() === username.toLowerCase())) {
    return badRequest("That username is already taken.", 409);
  }

  const { data: usernameTaken, error: customerLookupError } = await adminClient
    .rpc("is_username_taken", { check_username: username });
  if (customerLookupError) return badRequest("Could not check username availability.", 503);
  if (usernameTaken) return badRequest("That username is already taken.", 409);

  const { data: adminRole, error: roleLookupError } = await adminClient
    .from("roles").select("id").eq("name", "admin").maybeSingle();
  if (roleLookupError || !adminRole) return badRequest("Staff role is not configured in Supabase.", 503);

  // A UUID-based address avoids collisions with any real customer email.
  // No emails are sent by admin.createUser; staff log in by username.
  const internalAuthEmail = `staff-${randomUUID().replace(/-/g, "")}@staff.happytails.invalid`;
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: internalAuthEmail,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: `${firstName} ${lastName}`,
      account_type: "staff",
    },
  });
  if (createError || !created.user) {
    console.error("Staff Auth provisioning failed", createError?.name ?? "missing_user");
    return badRequest(createError?.message ?? "Unable to create staff authentication.", 500);
  }

  const staffUserId = created.user.id;
  // A failed setup must not leave a half-created user. This rollback only
  // deletes the NEW, unfinished Auth identity, not any existing account.
  async function failProvisioning(reason: string) {
    const { error: rollbackError } = await adminClient.auth.admin.deleteUser(staffUserId);
    if (rollbackError) {
      console.error("Staff provisioning rollback failed", { staffUserId, error: rollbackError.message });
      return badRequest("Staff setup failed and automatic cleanup could not complete. Contact your database administrator before retrying.", 500);
    }
    return badRequest(`${reason} No staff account was created.`, 500);
  }

  // Profiles is populated by the existing Supabase Auth trigger. Never
  // create a SECOND profile or insert into the customers table here.
  const { data: profile, error: profileUpdateError } = await adminClient
    .from("profiles")
    .update({ role: "admin", role_id: adminRole.id })
    .eq("id", staffUserId)
    .select("id, role")
    .maybeSingle();
  if (profileUpdateError || !profile || profile.role !== "admin") {
    console.error("Staff role assignment failed", profileUpdateError?.code ?? "missing_profile");
    return failProvisioning("Could not assign the staff role.");
  }

  const { data: staffProfile, error: insertError } = await adminClient
    .from("staff_profiles")
    .insert({
      id: staffUserId,
      first_name: firstName,
      middle_name: middleName || null,
      last_name: lastName,
      username,
      // Never expose the random Supabase Auth identifier as a contact email.
      email: null,
      phone_number: phoneNumber || null,
      job_title: jobTitle,
      role_id: adminRole.id,
      status: "active",
    })
    .select()
    .single();
  if (insertError || !staffProfile) {
    console.error("Staff profile insertion failed", insertError?.code ?? "missing_profile");
    return failProvisioning(`Could not create staff profile${insertError ? `: ${insertError.message}` : "."}`);
  }

  // On some installations, the auth.users INSERT trigger automatically
  // creates a public.customers row for EVERY Auth user. Remove only the
  // shadow row attached to this brand-new staff identity. Check the actual
  // database outcome; a successful DELETE without affected rows is not
  // enough to establish that the account is staff-only.
  const { error: shadowDeleteError } = await adminClient
    .from("customers").delete().eq("id", staffUserId);
  if (shadowDeleteError) {
    console.error("Staff customer-shadow removal failed", shadowDeleteError.code);
    return failProvisioning("Could not remove the auto-generated customer profile.");
  }
  const { data: customerShadow, error: shadowCheckError } = await adminClient
    .from("customers").select("id").eq("id", staffUserId).maybeSingle();
  if (shadowCheckError || customerShadow) {
    console.error("Staff customer-shadow verification failed", shadowCheckError?.code ?? "customer_row_still_exists");
    return failProvisioning("Staff-only account verification failed.");
  }

  const { error: auditError } = await adminClient.from("audit_logs").insert({
    actor_id: actor.id,
    actor_role: actorProfile.role,
    action: "staff.created",
    target_type: "staff",
    target_id: staffUserId,
    details: { username, jobTitle, emailRequired: false },
  });
  if (auditError) console.error("Staff creation audit insert failed", auditError.code);

  return NextResponse.json({ staff: staffProfile }, {
    status: 201,
    headers: { "Cache-Control": "no-store" },
  });
}
