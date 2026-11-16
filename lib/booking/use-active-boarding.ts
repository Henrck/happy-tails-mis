"use client";
import { useCallback, useEffect, useState } from "react";
import { fetchActiveBoardingPets, type ActiveBoarding } from "@/lib/supabase/active-boarding";

/** Loads which of the given pets already have an unfinished boarding booking.
 * Re-checks whenever the pet list changes; call refresh() before showing services. */
export function useActiveBoarding(petIds: string[]) {
  const key = [...petIds].sort().join("|");
  const [result, setResult] = useState<{ key: string; byPet: Record<string, ActiveBoarding> } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    void fetchActiveBoardingPets(key ? key.split("|") : []).then(({ byPet, error }) => {
      if (!active) return;
      // The database trigger still blocks duplicates if this lookup fails.
      if (error) console.warn("Could not check existing boarding bookings:", error);
      setResult({ key, byPet });
    });
    return () => { active = false; };
  }, [key, version]);

  const refresh = useCallback(() => setVersion(v => v + 1), []);
  const loading = result?.key !== key;
  return { byPet: (!loading && result?.byPet) || {}, loading, refresh };
}
