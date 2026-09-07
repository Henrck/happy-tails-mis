"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchPackagesFull, fetchPetSizes, fetchAddonsByCategory,
  togglePackageActive, toggleSizeActive, toggleAddonActive,
} from "@/lib/supabase/services";
import type { ServiceType, Package, PackageInclusion, PackagePricing, PetSize, Addon, AddonPrice } from "@/lib/types/services";

import ServiceTabs from "@/components/admin/services/ServiceTabs";
import PackageCard from "@/components/admin/services/PackageCard";
import SizeGuideTable from "@/components/admin/services/SizeGuideTable";
import AddOnsSection from "@/components/admin/services/AddOnsSection";
import PackageFormModal from "@/components/admin/services/PackageFormModal";
import SizeFormModal from "@/components/admin/services/SizeFormModal";
import AddOnFormModal from "@/components/admin/services/AddOnFormModal";

export default function ServiceManagementPage() {
  const [tab, setTab] = useState<ServiceType>("dog_grooming");
  const [search, setSearch] = useState("");

  const [packages, setPackages] = useState<Package[]>([]);
  const [inclusions, setInclusions] = useState<PackageInclusion[]>([]);
  const [pricing, setPricing] = useState<PackagePricing[]>([]);
  const [sizes, setSizes] = useState<PetSize[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [addonPrices, setAddonPrices] = useState<AddonPrice[]>([]);
  const [aLaCarteAddons, setALaCarteAddons] = useState<Addon[]>([]);
  const [aLaCartePrices, setALaCartePrices] = useState<AddonPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [packageModal, setPackageModal] = useState<{ mode: "add" | "edit"; pkg?: Package } | null>(null);
  const [sizeModal, setSizeModal] = useState<{ mode: "add" | "edit"; size?: PetSize } | null>(null);
  const [addonModal, setAddonModal] = useState<{ mode: "add" | "edit"; addon?: Addon; categoryId: string } | null>(null);

  const addonCategoryName = tab === "boarding" ? "Boarding Add-ons" : "Grooming Add-ons";

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [pkgResult, sizeResult, addonResult, alaCarteResult] = await Promise.all([
      fetchPackagesFull(tab),
      tab !== "boarding" ? fetchPetSizes(tab) : Promise.resolve({ sizes: [], error: null }),
      fetchAddonsByCategory(addonCategoryName),
      fetchAddonsByCategory("Ala Carte"),
    ]);

    setPackages(pkgResult.packages);
    setInclusions(pkgResult.inclusions);
    setPricing(pkgResult.pricing);
    setSizes(sizeResult.sizes);
    setAddons(addonResult.addons);
    setAddonPrices(addonResult.prices);
    setALaCarteAddons(alaCarteResult.addons);
    setALaCartePrices(alaCarteResult.prices);

    if (pkgResult.error) setError(pkgResult.error);
    setLoading(false);
  }, [tab, addonCategoryName]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredPackages = packages.filter((p) => !search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase()));

  async function handleTogglePackage(pkg: Package) {
    await togglePackageActive(pkg.id, !pkg.is_active);
    loadData();
  }
  async function handleToggleSize(size: PetSize) {
    await toggleSizeActive(size.id, !size.is_active);
    loadData();
  }
  async function handleToggleAddon(addon: Addon) {
    await toggleAddonActive(addon.id, !addon.is_active);
    loadData();
  }

  async function handleArchivePackage(pkg: Package) {
    if (!confirm(`Archive "${pkg.name}"? This hides it from customers but keeps its history.`)) return;
    await togglePackageActive(pkg.id, false);
    loadData();
  }
  async function handleArchiveSize(size: PetSize) {
    if (!confirm(`Archive "${size.label}"? Existing packages keep their pricing, but this size won't be offered for new packages.`)) return;
    await toggleSizeActive(size.id, false);
    loadData();
  }
  async function handleArchiveAddon(addon: Addon) {
    if (!confirm(`Archive "${addon.name}"?`)) return;
    await toggleAddonActive(addon.id, false);
    loadData();
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex-1 relative max-w-sm">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" />
          </svg>
          <input type="text" placeholder="Search packages" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-full border border-pink-200 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
        </div>
      </div>

      <h1 className="mt-6 text-2xl font-bold text-brand-pink">Service Management</h1>

      <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
        <ServiceTabs active={tab} onChange={setTab} />
      </div>

      {error && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">{error}</p>}

      {loading ? (
        <p className="mt-10 text-center text-zinc-400">Loading...</p>
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between">
            <h2 className="font-bold text-zinc-800">Package</h2>
            <button onClick={() => setPackageModal({ mode: "add" })} className="border-2 border-brand-pink text-brand-pink font-semibold text-sm px-5 py-1.5 rounded-full hover:bg-brand-pink hover:text-white transition-colors">
              Add Package
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPackages.length === 0 ? (
              <p className="col-span-full text-center text-zinc-400 py-8">No packages yet for this service.</p>
            ) : (
              filteredPackages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  inclusions={inclusions.filter((i) => i.package_id === pkg.id)}
                  pricing={pricing.filter((p) => p.package_id === pkg.id)}
                  onEdit={() => setPackageModal({ mode: "edit", pkg })}
                  onToggleActive={() => handleTogglePackage(pkg)}
                  onArchive={() => handleArchivePackage(pkg)}
                />
              ))
            )}
          </div>

          {tab !== "boarding" && (
            <div className="mt-8">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-zinc-800">Size Guide</h2>
                <button onClick={() => setSizeModal({ mode: "add" })} className="border-2 border-brand-pink text-brand-pink font-semibold text-sm px-5 py-1.5 rounded-full hover:bg-brand-pink hover:text-white transition-colors">
                  Add Size
                </button>
              </div>
              <div className="mt-3">
                <SizeGuideTable sizes={sizes} onEdit={(size) => setSizeModal({ mode: "edit", size })} onToggleActive={handleToggleSize} onArchive={handleArchiveSize} />
              </div>
            </div>
          )}

          <div className="mt-8">
            <div className="flex items-center justify-between">
              <div />
              <button
                onClick={async () => {
                  const supabase = createClient();
                  const { data } = await supabase.from("addon_categories").select("id").eq("name", addonCategoryName).single();
                  if (data) setAddonModal({ mode: "add", categoryId: data.id });
                }}
                className="border-2 border-brand-pink text-brand-pink font-semibold text-sm px-5 py-1.5 rounded-full hover:bg-brand-pink hover:text-white transition-colors"
              >
                Add Add-Ons
              </button>
            </div>
            <div className="mt-3">
              <AddOnsSection
                title={addonCategoryName}
                addons={addons}
                prices={addonPrices}
                onEdit={(addon) => setAddonModal({ mode: "edit", addon, categoryId: addon.category_id })}
                onToggleActive={handleToggleAddon}
                onArchive={handleArchiveAddon}
              />
            </div>
          </div>

          <div className="mt-8">
            <AddOnsSection
              title="Ala Carte"
              addons={aLaCarteAddons}
              prices={aLaCartePrices}
              onEdit={(addon) => setAddonModal({ mode: "edit", addon, categoryId: addon.category_id })}
              onToggleActive={handleToggleAddon}
              onArchive={handleArchiveAddon}
            />
          </div>
        </>
      )}

      {packageModal && (
        <PackageFormModal
          serviceType={tab}
          sizes={sizes}
          existing={packageModal.pkg}
          existingInclusions={packageModal.pkg ? inclusions.filter((i) => i.package_id === packageModal.pkg!.id) : undefined}
          existingPricing={packageModal.pkg ? pricing.filter((p) => p.package_id === packageModal.pkg!.id) : undefined}
          onClose={() => setPackageModal(null)}
          onSaved={() => { setPackageModal(null); loadData(); }}
        />
      )}

      {sizeModal && (
        <SizeFormModal serviceType={tab} existing={sizeModal.size} onClose={() => setSizeModal(null)} onSaved={() => { setSizeModal(null); loadData(); }} />
      )}

      {addonModal && (
        <AddOnFormModal
          categoryId={addonModal.categoryId}
          existing={addonModal.addon}
          existingPrices={addonModal.addon ? [...addonPrices, ...aLaCartePrices].filter((p) => p.addon_id === addonModal.addon!.id) : undefined}
          onClose={() => setAddonModal(null)}
          onSaved={() => { setAddonModal(null); loadData(); }}
        />
      )}
    </div>
  );
}
