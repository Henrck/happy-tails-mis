"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchPackagesFull, fetchAddonsByCategory } from "@/lib/supabase/services";
import { blockingReason, hasFreeBathDry, isBathDry, boardingBathDryPrice } from "@/lib/booking/boarding-promotions";
import { MIN_EXTENDED_BOARDING_NIGHTS, MAX_BOARDING_NIGHTS, extendedBoardingNightError,
  isExtendedBoardingRate, parseExtendedBoardingNights } from "@/lib/booking/boarding-duration";
import type { Package, PackagePricing, Addon, AddonPrice } from "@/lib/types/services";
import type { Pet, DraftPetSelection } from "@/lib/types/appointments";
import { validShareGroup, shareError, shareGroups, withSharedKennelPrices, type ShareSelection } from "@/lib/booking/boarding-share";

type KennelSize = "small" | "big";
function petTier(pet: Pet): "small" | "medium" | "large" | null {
  const size = (pet.size_label ?? "").trim().toLowerCase();
  if (size === "small") return "small";
  if (size === "medium") return "medium";
  if (/large|^(?:[2-9]xl|x{1,5}l)$/.test(size)) return "large";
  return null;
}
function fixedNights(rate: PackagePricing): number | null {
  if (isExtendedBoardingRate(rate)) return null;
  if (rate.nights != null && Number.isSafeInteger(rate.nights) && rate.nights > 0) return rate.nights;
  const match = `${rate.size_detail ?? ""} ${rate.size_label}`.match(/(\d+)\s*nights?/i);
  return match ? Number(match[1]) : null;
}

export default function BoardingSelectionStep({ pets, selections, onChange, scheduledDate: _scheduledDate, onBack,
  onNext, alreadyGroomedPetIds = [], combined = false, onPrepared }: {
  pets: Pet[];
  selections: DraftPetSelection[];
  onChange: (items: DraftPetSelection[]) => void;
  scheduledDate: string | null;
  onBack: () => void;
  onNext: () => void;
  alreadyGroomedPetIds?: string[];
  combined?: boolean;
  onPrepared?: (pricing: PackagePricing[], valid: boolean) => void;
}) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [pricing, setPricing] = useState<PackagePricing[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [addonPrices, setAddonPrices] = useState<AddonPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareTargets, setShareTargets] = useState<string[]>([]);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [custom, setCustom] = useState<Record<string, string>>(() => Object.fromEntries(
    selections.filter(s => s.boardingNights != null).map(s => [s.pet.id, String(s.boardingNights)])
  ));
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [result, extra] = await Promise.all([fetchPackagesFull("boarding"), fetchAddonsByCategory("Boarding Add-ons")]);
      if (result.error || extra.error) throw new Error(result.error || extra.error || "Unable to load boarding services");
      setPackages(result.packages.filter((p) => p.is_active));
      setPricing(result.pricing);
      setAddons(extra.addons.filter((p) => p.is_active));
      setAddonPrices(extra.prices);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load boarding pricing"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const forPet = (pet: Pet) => selections.find((s) => s.pet.id === pet.id);
  const rateFor = (s?: DraftPetSelection) => pricing.find((r) => r.id === s?.packagePricingId);
  const nightsFor = (s?: DraftPetSelection) => s?.boardingNights ?? (rateFor(s) ? fixedNights(rateFor(s)!) : null);
  function addonPrice(id: string, pet: Pet) {
    const addon = addons.find((a) => a.id === id);
    return addon && isBathDry(addon.name) ? boardingBathDryPrice(pet.size_label)
      : addonPrices.find((p) => p.addon_id === id)?.price ?? 0;
  }
  function recalculate(s: DraftPetSelection): DraftPetSelection {
    const rate = rateFor(s);
    const nights = nightsFor(s);
    if (rate && isExtendedBoardingRate(rate) && parseExtendedBoardingNights(nights) === null) return { ...s, lineAmount: 0 };
    const usable = s.addonIds.filter((id) => {
      const addon = addons.find((a) => a.id === id);
      return addon && !blockingReason(addon.name, nights, alreadyGroomedPetIds.includes(s.pet.id));
    });
    const base = rate ? rate.price * (isExtendedBoardingRate(rate) ? nights ?? 0 : 1) : 0;
    return { ...s, addonIds: usable, lineAmount: base + usable.reduce((n, id) => n + addonPrice(id, s.pet), 0) };
  }
  function update(pet: Pet, patch: Partial<DraftPetSelection>) {
    const original: DraftPetSelection = forPet(pet) ?? { pet, packageId: null, packagePricingId: null,
      sizeId: null, kennelId: null, groomerId: null, addonIds: [], lineAmount: 0 };
    const changed = (patch.boardingKennelSize !== undefined && patch.boardingKennelSize !== original.boardingKennelSize) ||
      (patch.packagePricingId !== undefined && patch.packagePricingId !== original.packagePricingId) ||
      ("boardingNights" in patch && patch.boardingNights !== original.boardingNights);
    const next = recalculate({ ...original, ...patch, ...(changed ? {
      boardingScheduledDate: null, boardingDropOffAt: null, boardingPickUpAt: null, kennelId: null,
    } : {}) });
    let all = [...selections.filter((s) => s.pet.id !== pet.id), next] as ShareSelection[];
    const previousGroup = (original as ShareSelection).boardingShareGroupId;
    // Changing a shared pet's kennel/package/duration dissolves the old group;
    // editing add-ons keeps the group and recalculates the single base charge.
    if (changed && previousGroup) {
      all = all.map(s => s.boardingShareGroupId === previousGroup
        ? { ...s, boardingShareGroupId: null } : s);
      setShareNotice("The shared kennel was removed because its package or duration changed. You can create the group again below.");
    }
    onChange(withSharedKennelPrices(all.map(recalculate), pricing));
  }
  function chooseSize(pet: Pet, size: KennelSize) {
    if (size === "small" && !["small", "medium"].includes(petTier(pet) ?? "")) return;
    const pkg = packages.find((p) => p.name.toLowerCase().includes(size === "small" ? "small" : "big"));
    update(pet, { boardingKennelSize: size, packageId: pkg?.id ?? null, packagePricingId: null,
      boardingNights: null, addonIds: [] });
  }
  function chooseRate(pet: Pet, rate: PackagePricing) {
    const nights = isExtendedBoardingRate(rate) ? parseExtendedBoardingNights(custom[pet.id]) : fixedNights(rate);
    update(pet, { packageId: rate.package_id, packagePricingId: rate.id, boardingNights: nights });
  }
  function changeNights(pet: Pet, value: string) {
    setCustom((prev) => ({ ...prev, [pet.id]: value }));
    update(pet, { boardingNights: parseExtendedBoardingNights(value) });
  }
  function toggle(pet: Pet, id: string) {
    const s = forPet(pet); if (!s) return;
    const rate = rateFor(s);
    if (rate && isExtendedBoardingRate(rate) && parseExtendedBoardingNights(s.boardingNights) === null) return;
    update(pet, { addonIds: s.addonIds.includes(id) ? s.addonIds.filter((x) => x !== id) : [...s.addonIds, id] });
  }
  function createGroup() {
    const group = selections.filter(s => shareTargets.includes(s.pet.id)) as ShareSelection[];
    if (!validShareGroup(group)) {
      setShareNotice("Choose Small + Medium, Medium + Medium, or 3 Small pets. All must use the same Big kennel package and duration.");
      return;
    }
    if (group.some(s => (s as ShareSelection).boardingShareGroupId)) {
      setShareNotice("A selected pet already belongs to a shared kennel. Remove that group before creating another.");
      return;
    }
    const groupId = `share:${group.map(s => s.pet.id).sort().join(":")}`;
    const next = (selections as ShareSelection[]).map(s => shareTargets.includes(s.pet.id)
      ? { ...s, boardingShareGroupId: groupId } : s);
    onChange(withSharedKennelPrices(next.map(recalculate), pricing));
    setShareTargets([]);
    setShareNotice("Shared Big kennel selected. One kennel base rate will be charged for this group; per-pet add-ons remain separate.");
  }
  function removeGroup(groupId: string) {
    const next = (selections as ShareSelection[]).map(s => s.boardingShareGroupId === groupId
      ? { ...s, boardingShareGroupId: null } : s);
    onChange(next.map(recalculate));
    setShareNotice("Sharing removed; each pet has its own kennel base charge again.");
  }
  const selectedGroups = shareGroups(selections as ShareSelection[]);
  const currentShareError = shareError(selections as ShareSelection[]);
  const valid = !error && !currentShareError && pets.length > 0 && pets.every((pet) => {
    const s = forPet(pet), rate = rateFor(s), nights = nightsFor(s);
    return !!s && !!petTier(pet) && !!s.boardingKennelSize &&
      !(s.boardingKennelSize === "small" && !["small", "medium"].includes(petTier(pet) ?? "")) &&
      !!rate && rate.package_id === s.packageId &&
      typeof nights === "number" && Number.isSafeInteger(nights) && nights > 0 && nights <= MAX_BOARDING_NIGHTS &&
      (!isExtendedBoardingRate(rate) || parseExtendedBoardingNights(nights) !== null);
  });
  useEffect(() => { onPrepared?.(pricing, valid && !loading); }, [onPrepared, pricing, valid, loading]);
  if (loading) return <p className="py-10 text-center text-zinc-500">Loading boarding packages…</p>;
  return <section className="mx-auto max-w-3xl">
    <h2 className="text-center text-xl font-bold text-brand-pink">Pet Hotel / Boarding</h2>
    <p className="mt-2 text-center text-sm text-zinc-600">Step 1 of 2 — choose the kennel and duration for each pet. Next, check availability for the <strong>entire stay</strong> in the Dates step.</p>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <p className="mt-4 rounded-xl bg-pink-50 p-4 text-xs leading-5 text-zinc-700">Each Small kennel accepts one Small <b>or Medium</b> pet. Sharing one Big kennel is available for exactly Small + Medium, Medium + Medium, or three Small pets. All other pets use separate kennels. Live capacity is verified using active kennels for the entire stay. Free Bath & Dry begins at four nights.</p>
    {pets.map((pet) => {
      const s = forPet(pet), tier = petTier(pet), size = s?.boardingKennelSize;
      const eligible = size === "small" ? tier === "small" || tier === "medium" : true;
      const rates = size ? packages.filter((p) => p.name.toLowerCase().includes(size === "small" ? "small" : "big"))
        .flatMap((p) => pricing.filter((r) => r.package_id === p.id)).sort((a, b) => (fixedNights(a) ?? 999) - (fixedNights(b) ?? 999)) : [];
      const rate = rateFor(s), nights = nightsFor(s), extended = !!rate && isExtendedBoardingRate(rate);
      const raw = custom[pet.id] ?? (s?.boardingNights && s.boardingNights >= MIN_EXTENDED_BOARDING_NIGHTS ? String(s.boardingNights) : "");
      const durationError = extended ? extendedBoardingNightError(raw) : null;
      const allowedAddons = !durationError;
      return <div key={pet.id} className="mt-5 rounded-2xl border border-pink-100 bg-white p-4 sm:p-5">
        <h3 className="font-bold text-zinc-800">{pet.name} <span className="font-normal text-zinc-500">({pet.size_label})</span></h3>
        <p className="mt-3 text-sm font-semibold">Kennel size</p>
        <div className="mt-2 grid grid-cols-2 gap-2">{(["small", "big"] as KennelSize[]).map((kind) => <button type="button" key={kind}
          disabled={kind === "small" && tier !== "small" && tier !== "medium"} onClick={() => chooseSize(pet, kind)}
          className={`rounded-xl border-2 p-3 text-sm font-semibold ${kind === "small" && tier !== "small" && tier !== "medium" ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400" : size === kind ? "border-brand-pink bg-brand-pink text-white" : "border-pink-100 text-zinc-700"}`}>
          {kind === "small" ? "Small Kennel" : "Big Kennel"}{kind === "small" && tier !== "small" && tier !== "medium" ? <span className="block text-xs">Small or Medium only</span> : null}
        </button>)}</div>
        {tier === "large" && <p className="mt-2 text-xs font-semibold text-amber-800">Large and above: Big kennel only, one pet per kennel. The Dates step checks the active Big kennel capacity across the entire stay.</p>}
        {tier === "medium" && <p className="mt-2 text-xs text-emerald-700">Medium pets may use a Small kennel alone, or share a Big kennel with one Small pet from this same booking.</p>}
        {!tier && <p className="mt-2 text-xs text-red-600">Pet size is not recognized. Correct the Pet Record before booking.</p>}
        {size && !eligible && <p className="mt-2 text-xs text-red-600">Large and above pets must use a Big kennel.</p>}
        {size && <><p className="mt-4 text-sm font-semibold">Stay duration</p><div className="mt-2 flex flex-wrap gap-2">{rates.map((r) => <button type="button" key={r.id} onClick={() => chooseRate(pet, r)}
          className={`rounded-xl border-2 px-3 py-2 text-xs font-semibold ${rate?.id === r.id ? "border-brand-pink bg-brand-pink text-white" : "border-pink-100 text-zinc-700"}`}>
          {r.size_detail || r.size_label} — ₱{r.price.toLocaleString()}{isExtendedBoardingRate(r) ? "/night" : ""}
        </button>)}</div></>}
        {extended && <label className="mt-4 block rounded-xl border border-pink-100 bg-pink-50 p-3 text-sm font-semibold">Number of nights (7 Days & Up)
          <input type="number" min={MIN_EXTENDED_BOARDING_NIGHTS} max={MAX_BOARDING_NIGHTS} step="1" inputMode="numeric" value={raw}
            onChange={(e) => changeNights(pet, e.target.value)} placeholder="e.g. 7" className="mt-2 block w-40 rounded-lg border border-pink-200 bg-white p-2.5"/>
          <span className={`mt-2 block text-xs ${durationError ? "text-rose-700" : "text-emerald-700"}`}>{durationError ?? `Valid: ${nights} nights`}</span>
        </label>}
        {rate && nights && !durationError && <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2.5 text-xs text-sky-900">
          <strong>Stay duration: {nights} night{nights === 1 ? "" : "s"} = {nights + 1} calendar day{nights + 1 === 1 ? "" : "s"}.</strong>
          <span className="mt-1 block">Pickup is calculated from the check-in day plus {nights} night{nights === 1 ? "" : "s"}. The Dates calendar checks every overlapping day and night—not only check-in.</span>
        </div>}
        {rate && nights && !durationError && <p className="mt-3 text-xs font-semibold text-emerald-700">{hasFreeBathDry(nights) ? "Complimentary Bath & Dry included" : "Bath & Dry is optional for stays under four nights."}</p>}
        {rate && <><p className="mt-4 text-sm font-semibold">Optional boarding add-ons</p><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{addons.map((addon) => {
          const blocked = blockingReason(addon.name, nights, alreadyGroomedPetIds.includes(pet.id));
          const selected = s?.addonIds.includes(addon.id) ?? false;
          return <button key={addon.id} type="button" disabled={!allowedAddons || !!blocked} title={blocked ?? undefined} onClick={() => toggle(pet, addon.id)}
            className={`rounded-xl border-2 p-3 text-left text-xs ${!allowedAddons || blocked ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400" : selected ? "border-brand-pink bg-brand-pink text-white" : "border-pink-100 text-zinc-700"}`}>
            <b>{addon.name}</b><span className="mt-1 block">{!allowedAddons ? "Enter duration" : blocked ? "Unavailable / Included" : `+₱${addonPrice(addon.id, pet).toLocaleString()}`}</span>
          </button>;
        })}</div></>}
        {s && rate && allowedAddons && eligible && <p className="mt-4 text-right font-bold text-brand-pink">Subtotal ₱{s.lineAmount.toLocaleString()}{(s as ShareSelection).boardingShareGroupId && <span className="ml-2 text-xs font-normal text-emerald-700">Shared kennel</span>}</p>}
      </div>;
    })}
    {pets.length > 1 && <section aria-label="Share one Big kennel" className="mt-6 rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-4 sm:p-5">
      <h3 className="text-lg font-bold text-emerald-900">Share One Big Kennel — Pay One Kennel Rate</h3>
      <p className="mt-1 text-sm text-emerald-900">Choose compatible pets who will stay together. Allowed groups: <b>Small + Medium</b>, <b>Medium + Medium</b>, or <b>Small + Small + Small</b>. Two Small pets alone are not an eligible shared group.</p>
      <p className="mt-2 text-xs text-emerald-800">First choose the <b>Big kennel</b> and <b>same package/duration</b> for every pet you want to share. Their add-ons stay individually priced.</p>
      <p className="mt-2 rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-xs leading-5 text-emerald-900"><b>One kennel, one base charge:</b> a 6-day / 5-night shared stay priced at ₱2,400 costs ₱2,400 total for the kennel, not ₱2,400 per pet (individual add-ons, if chosen, are extra). If one pet is collected earlier, staff can check out that pet separately; the remaining pet continues using the kennel until its scheduled pickup. An early pickup does not automatically reduce the agreed kennel price.</p>
      {selectedGroups.map(group => <div key={group[0].boardingShareGroupId} className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-white p-3 text-sm">
        <span><b>Shared kennel:</b> {group.map(s => s.pet.name).join(" + ")}</span>
        <button type="button" className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700" onClick={() => removeGroup(group[0].boardingShareGroupId!)}>Separate pets</button>
      </div>)}
      <div className="mt-3 flex flex-wrap gap-2">{pets.map(pet => {
        const sel = forPet(pet) as ShareSelection | undefined;
        const grouped = !!sel?.boardingShareGroupId;
        const available = !grouped && !!sel?.packagePricingId && sel.boardingKennelSize === "big" && ["small", "medium"].includes(petTier(pet) ?? "");
        return <label key={pet.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${available ? "cursor-pointer border-emerald-300 bg-white text-zinc-800" : "border-zinc-200 bg-zinc-100 text-zinc-400"}`}>
          <input type="checkbox" disabled={!available} checked={available && shareTargets.includes(pet.id)} onChange={e => setShareTargets(previous => e.target.checked ? [...previous, pet.id] : previous.filter(id => id !== pet.id))}/>
          {pet.name} ({pet.size_label}){grouped ? " · grouped" : ""}
        </label>;
      })}</div>
      <button type="button" disabled={shareTargets.length < 2 || shareTargets.length > 3} onClick={createGroup} className="mt-4 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40">Share Selected Pets</button>
      {shareNotice && <p role="status" className="mt-3 rounded-xl bg-white p-3 text-xs text-emerald-900">{shareNotice}</p>}
      {currentShareError && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{currentShareError}</p>}
      {selectedGroups.length > 0 && <p className="mt-3 text-sm font-semibold text-emerald-900">Combined boarding subtotal: ₱{selections.reduce((total,s) => total+s.lineAmount,0).toLocaleString()}</p>}
    </section>}
    {combined ? <div className="mt-6 flex items-center justify-between gap-3"><button type="button" onClick={onBack} className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold">Back to waiver</button><p className="text-xs text-zinc-500">{valid ? "Pick an available group date below ↓" : "Complete each pet to see availability."}</p></div>
      : <div className="mt-6 grid grid-cols-2 gap-3"><button onClick={onBack} className="rounded-full border border-zinc-300 py-3">Back</button><button disabled={!valid} onClick={() => { onChange(withSharedKennelPrices(selections.map(recalculate) as ShareSelection[],pricing)); onNext(); }} className="rounded-full bg-brand-pink py-3 font-semibold text-white disabled:opacity-40">Next: Boarding Dates</button></div>}
  </section>;
}
