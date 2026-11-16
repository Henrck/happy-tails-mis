// Client helper for the /api/pets/photo route. The route verifies ownership
// (or staff role), stores the JPEG and saves pets.photo_url.

/** A cropped photo chosen before the pet record exists. */
export type PetPhotoDraft = { blob: Blob; previewUrl: string };

export async function uploadPetPhoto(petId: string, photo: Blob): Promise<string> {
  const payload = new FormData();
  payload.append("photo", photo, "pet.jpg");
  const response = await fetch(`/api/pets/photo?petId=${encodeURIComponent(petId)}`, { method: "POST", body: payload });
  const result = await response.json().catch(() => ({})) as { error?: string; url?: string };
  if (!response.ok || !result.url) throw new Error(result.error || "Could not save the pet photo.");
  return result.url;
}
