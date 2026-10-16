import { createClient } from "./client";
import type { ServiceType, Package, PackageInclusion, PackagePricing, PetSize, Addon, AddonPrice } from "@/lib/types/services";
export async function fetchPackagesFull(serviceType:ServiceType){
 const db=createClient();const {data:packages,error:pErr}=await db.from("packages").select("*").eq("service_type",serviceType).order("sort_order");
 if(pErr||!packages)return {packages:[] as Package[],inclusions:[] as PackageInclusion[],pricing:[] as PackagePricing[],error:pErr?.message??"Unable to load packages"};
 if(!packages.length)return {packages:[] as Package[],inclusions:[] as PackageInclusion[],pricing:[] as PackagePricing[],error:null};
 const ids=packages.map(p=>p.id);const [i,p]=await Promise.all([db.from("package_inclusions").select("*").in("package_id",ids).order("sort_order"),db.from("package_pricing").select("*").in("package_id",ids).order("id")]);
 return {packages:packages as Package[],inclusions:(i.data??[]) as PackageInclusion[],pricing:(p.data??[]) as PackagePricing[],error:i.error?.message??p.error?.message??null};
}
export async function fetchPetSizes(serviceType:ServiceType){const {data,error}=await createClient().from("pet_sizes").select("*").eq("service_type",serviceType).order("sort_order");return {sizes:(data??[]) as PetSize[],error:error?.message??null};}
export async function fetchAddonsByCategory(categoryName:string){const db=createClient();const {data:category,error:categoryError}=await db.from("addon_categories").select("id").eq("name",categoryName).single();if(categoryError||!category)return {addons:[] as Addon[],prices:[] as AddonPrice[],error:categoryError?.message??"Category not found"};const {data:addons,error:addonError}=await db.from("addons").select("*").eq("category_id",category.id).order("sort_order");const ids=(addons??[]).map(a=>a.id);if(!ids.length)return {addons:[] as Addon[],prices:[] as AddonPrice[],error:addonError?.message??null};const {data:prices,error:priceError}=await db.from("addon_prices").select("*").in("addon_id",ids).order("id");return {addons:(addons??[]) as Addon[],prices:(prices??[]) as AddonPrice[],error:addonError?.message??priceError?.message??null};}
// .select().single() makes an update that matches zero rows report an error instead of silently succeeding.
export async function togglePackageActive(id:string,isActive:boolean){return createClient().from("packages").update({is_active:isActive}).eq("id",id).select("id").single();}
export async function toggleSizeActive(id:string,isActive:boolean){return createClient().from("pet_sizes").update({is_active:isActive}).eq("id",id).select("id").single();}
export async function toggleAddonActive(id:string,isActive:boolean){return createClient().from("addons").update({is_active:isActive}).eq("id",id).select("id").single();}
