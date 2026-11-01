import { createClient } from "@/lib/supabase/client";

export type ArchivedPet = { id: string; name: string; breed: string; species: string; size_label: string; archived_at: string | null };

export async function listArchivedCustomerPets(customerId: string): Promise<{ pets: ArchivedPet[]; error: string | null }> {
  const { data, error } = await createClient().from("pets")
    .select("id,name,breed,species,size_label,archived_at")
    .eq("customer_id", customerId).not("archived_at", "is", null).order("archived_at", { ascending: false });
  return { pets: (data ?? []) as ArchivedPet[], error: error?.message ?? null };
}

export async function setCustomerPetArchived(petId: string, archived: boolean): Promise<string | null> {
  const { error } = await createClient().rpc("happytails_set_customer_pet_archived", {
    p_pet_id: petId, p_archived: archived,
  });
  return error?.message ?? null;
}
