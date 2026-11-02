export type Groomer = { id: string; name: string; status: "active" | "archived"; created_at: string };
export type KennelSize = "small" | "big";
export type Kennel = { id: string; size: KennelSize; number: number; created_at: string; is_active?: boolean; name?: string | null };
export const kennelDisplayName = (k: Pick<Kennel, "number" | "name">) => k.name?.trim() || `Kennel ${k.number}`;
