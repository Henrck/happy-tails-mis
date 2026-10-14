"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SiteSetting } from "@/lib/supabase/site-settings";
import { PET_AVATAR_KEYS } from "@/lib/utils/pet-avatar";

let cache: SiteSetting[] | null = null;
let inflight: Promise<SiteSetting[]> | null = null;
async function readSettings() {
  if (cache) return cache;
  if (!inflight) {
    inflight = (async () => {
      const { data, error } = await createClient().from("site_settings").select("*").in("key", PET_AVATAR_KEYS);
      if (error) throw error;
      cache = (data as SiteSetting[]) ?? [];
      return cache;
    })().finally(() => { inflight = null; });
  }
  return inflight;
}
export function usePetAvatarSettings() {
  const [settings, setSettings] = useState<SiteSetting[]>(cache ?? []);
  useEffect(() => {
    let mounted = true;
    readSettings().then((rows) => { if (mounted) setSettings(rows); }).catch(() => {});
    return () => { mounted = false; };
  }, []);
  return settings;
}
