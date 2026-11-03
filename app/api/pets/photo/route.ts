import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
const BUCKET = "pet-profile-photos";
const MAX_BYTES = 2 * 1024 * 1024;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

function isJpeg(buffer: Uint8Array) { return buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff; }
function fail(error: string, status: number) { return NextResponse.json({ error }, { status }); }

export async function POST(request: NextRequest) {
  try {
    const petId = request.nextUrl.searchParams.get("petId") || "";
    if (!uuid.test(petId)) return fail("Invalid pet identifier.", 400);
    const auth = await createClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) return fail("Sign in to change a pet photo.", 401);
    const admin = createAdminClient();
    const { data: pet, error: petError } = await admin.from("pets").select("id,customer_id,photo_url").eq("id", petId).maybeSingle();
    if (petError) return fail("Could not verify the pet record.", 500);
    if (!pet) return fail("Pet not found.", 404);
    if (pet.customer_id !== user.id) {
      const { data: roleRow, error: roleError } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (roleError || !["admin", "superadmin"].includes(roleRow?.role ?? "")) return fail("You cannot edit this pet's photo.", 403);
    }
    const data = await request.formData();
    const file = data.get("photo");
    if (!(file instanceof File)) return fail("Choose a photo.", 400);
    if (file.type !== "image/jpeg" || file.size < 100 || file.size > MAX_BYTES) return fail("The cropped photo must be a JPEG under 2 MB.", 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isJpeg(bytes)) return fail("The image file is invalid.", 400);
    const path = `${petId}/${randomUUID()}.jpg`;
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: "image/jpeg", upsert: false, cacheControl: "3600" });
    if (uploadError) return fail(`Unable to upload photo: ${uploadError.message}`, 500);
    const { data: publicLink } = admin.storage.from(BUCKET).getPublicUrl(path);
    const url = publicLink.publicUrl;
    const { data: updated, error: updateError } = await admin.from("pets").update({ photo_url: url }).eq("id", petId).select("photo_url").single();
    if (updateError || !updated) {
      await admin.storage.from(BUCKET).remove([path]);
      return fail("Unable to save the new profile picture. Check the database migration.", 500);
    }
    // Only remove files that clearly belong to this pet inside this bucket.
    const oldUrl = String(pet.photo_url ?? "");
    const needle = `/storage/v1/object/public/${BUCKET}/${petId}/`;
    if (oldUrl.includes(needle)) {
      const oldPath = oldUrl.split(needle)[1]?.split("?")[0];
      if (oldPath && /^[a-f0-9-]{36}\.jpg$/i.test(oldPath)) {
        void admin.storage.from(BUCKET).remove([`${petId}/${oldPath}`]);
      }
    }
    return NextResponse.json({ url });
  } catch {
    return fail("Could not upload this pet photo. Please try again.", 500);
  }
}
