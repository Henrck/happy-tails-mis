export type ServiceType = "dog_grooming" | "cat_grooming" | "boarding";

export type Package = {
  id: string;
  service_type: ServiceType;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export type PackageInclusion = {
  id: string;
  package_id: string;
  label: string;
  sort_order: number;
};

export type PackagePricing = {
  id: string;
  package_id: string;
  size_id: string | null;
  size_label: string;
  size_detail: string | null;
  price: number;
  is_per_night: boolean;
};

export type PetSize = {
  id: string;
  service_type: ServiceType;
  label: string;
  weight_range: string;
  sort_order: number;
  is_active: boolean;
};

export type AddonCategory = { id: string; name: string };

export type Addon = {
  id: string;
  category_id: string;
  name: string;
  price_note: string | null;
  sort_order: number;
  is_active: boolean;
};

export type AddonPrice = {
  id: string;
  addon_id: string;
  size_label: string;
  price: number;
};
