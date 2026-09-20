"use client";
// Multiple pet cards can render on the same page (My Pets grid, the
// booking wizard's pet list) — without a shared cache, each one would
// independently query site_settings for the same 4 rows. This fetches
// once per page load and shares the result.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SiteSetting } from "@/lib/supabase/site-settings";
import { PET_AVATAR_KEYS } from "@/lib/utils/pet-avatar";

let cache: SiteSetting[] | null = null;
let inflight: Promise<SiteSetting[]> | null = null;

async function loadPetAvatarSettings(): Promise<SiteSetting[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("site_settings").select("*").in("key", PET_AVATAR_KEYS);
      cache = (data as SiteSetting[]) ?? [];
      return cache;
    })();
  }
  return inflight;
}

export function usePetAvatarSettings(): SiteSetting[] {
  const [settings, setSettings] = useState<SiteSetting[]>(cache ?? []);

  useEffect(() => {
    let cancelled = false;
    loadPetAvatarSettings().then((result) => {
      if (!cancelled) setSettings(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return settings;
}
